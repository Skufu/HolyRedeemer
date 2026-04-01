package handlers

import (
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/holyredeemer/library-api/internal/cache"
	"github.com/holyredeemer/library-api/internal/middleware"
	"github.com/holyredeemer/library-api/internal/repositories/sqlcdb"
	"github.com/holyredeemer/library-api/pkg/response"
	"github.com/jackc/pgx/v5/pgxpool"
)

type DamageLostHandler struct {
	queries *sqlcdb.Queries
	db      *pgxpool.Pool
	cache   *cache.Cache
}

func NewDamageLostHandler(queries *sqlcdb.Queries, db *pgxpool.Pool, cache *cache.Cache) *DamageLostHandler {
	return &DamageLostHandler{queries: queries, db: db, cache: cache}
}

func (h *DamageLostHandler) invalidateDamageLostCaches() {
	h.cache.Delete(cache.DashboardStatsKey)
	h.cache.DeletePrefix(cache.BooksListPrefix)
	h.cache.DeletePrefix(cache.BookDetailPrefix)
}

type ReportDamageRequest struct {
	TransactionID string  `json:"transaction_id" binding:"required"`
	CopyID        string  `json:"copy_id" binding:"required"`
	IncidentType  string  `json:"incident_type" binding:"required"`
	Severity      string  `json:"severity" binding:"required"`
	Description   string  `json:"description"`
	AssessedCost  float64 `json:"assessed_cost"`
}

func (h *DamageLostHandler) ReportDamage(c *gin.Context) {
	var req ReportDamageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request body")
		return
	}

	transactionID, err := uuid.Parse(req.TransactionID)
	if err != nil {
		response.BadRequest(c, "Invalid transaction ID")
		return
	}

	copyID, err := uuid.Parse(req.CopyID)
	if err != nil {
		response.BadRequest(c, "Invalid copy ID")
		return
	}

	incidentType := strings.ToLower(strings.TrimSpace(req.IncidentType))
	if incidentType != "damage" && incidentType != "lost" {
		response.BadRequest(c, "Invalid incident type")
		return
	}

	severity := strings.ToLower(strings.TrimSpace(req.Severity))
	if severity == "" {
		response.BadRequest(c, "Severity is required")
		return
	}

	if req.AssessedCost < 0 {
		response.BadRequest(c, "Invalid assessed cost")
		return
	}

	authUser := middleware.GetAuthUser(c)
	if authUser == nil {
		response.Unauthorized(c, "User not authenticated")
		return
	}

	librarianUserID, err := uuid.Parse(authUser.ID)
	if err != nil {
		response.BadRequest(c, "Invalid user ID")
		return
	}

	tx, err := h.db.Begin(c.Request.Context())
	if err != nil {
		response.InternalError(c, "Failed to begin transaction")
		return
	}
	defer func() {
		_ = tx.Rollback(c.Request.Context())
	}()

	queries := h.queries.WithTx(tx)

	librarian, err := queries.GetLibrarianByUserID(c.Request.Context(), toPgUUID(librarianUserID))
	if err != nil {
		response.Forbidden(c, "Only librarians can report incidents")
		return
	}

	transaction, err := queries.GetTransactionByIDForUpdate(c.Request.Context(), transactionID)
	if err != nil {
		response.NotFound(c, "Transaction not found")
		return
	}

	if fromPgUUID(transaction.CopyID) != copyID {
		response.BadRequest(c, "Copy does not match transaction")
		return
	}

	copy, err := queries.GetCopyByIDForUpdate(c.Request.Context(), copyID)
	if err != nil {
		response.NotFound(c, "Book copy not found")
		return
	}

	receiptNo := generateReceiptNo()
	incidentDetails := fmt.Sprintf("%s incident (%s): %s", incidentType, severity, strings.TrimSpace(req.Description))
	replacementCostApplied := req.AssessedCost
	if incidentType == "lost" && replacementCostApplied <= 0 {
		replacementCostApplied = fromPgNumeric(transaction.ReplacementCostApplied)
		if replacementCostApplied <= 0 {
			replacementCostApplied = req.AssessedCost
		}
	}

	var updatedTransaction sqlcdb.Transaction
	if incidentType == "lost" {
		updatedTransaction, err = queries.MarkTransactionLost(c.Request.Context(), sqlcdb.MarkTransactionLostParams{
			ID:                     transaction.ID,
			ReceiptNo:              toPgText(receiptNo),
			ReplacementCostApplied: toPgNumeric(replacementCostApplied),
			IncidentDetails:        toPgText(incidentDetails),
		})
		if err != nil {
			response.InternalError(c, "Failed to update transaction")
			return
		}

		err = queries.UpdateCopyStatus(c.Request.Context(), sqlcdb.UpdateCopyStatusParams{
			ID:     copyID,
			Status: sqlcdb.NullCopyStatus{CopyStatus: sqlcdb.CopyStatusLost, Valid: true},
		})
		if err != nil {
			response.InternalError(c, "Failed to update copy status")
			return
		}
	} else if severity == "severe" || severity == "total_loss" {
		updatedTransaction, err = queries.MarkTransactionDamaged(c.Request.Context(), sqlcdb.MarkTransactionDamagedParams{
			ID:              transaction.ID,
			ReceiptNo:       toPgText(receiptNo),
			IncidentDetails: toPgText(incidentDetails),
		})
		if err != nil {
			response.InternalError(c, "Failed to update transaction")
			return
		}

		err = queries.UpdateCopyStatus(c.Request.Context(), sqlcdb.UpdateCopyStatusParams{
			ID:     copyID,
			Status: sqlcdb.NullCopyStatus{CopyStatus: sqlcdb.CopyStatusDamaged, Valid: true},
		})
		if err != nil {
			response.InternalError(c, "Failed to update copy status")
			return
		}
	} else {
		updatedTransaction = sqlcdb.Transaction{
			ID:        transaction.ID,
			StudentID: transaction.StudentID,
			CopyID:    transaction.CopyID,
			ReceiptNo: toPgText(receiptNo),
		}

		if _, err = tx.Exec(c.Request.Context(), `
			UPDATE transactions
			SET incident_type = 'damage',
			    circulation_status = 'damaged',
			    receipt_no = $2,
			    incident_details = $3
			WHERE id = $1
		`, transaction.ID, receiptNo, incidentDetails); err != nil {
			response.InternalError(c, "Failed to update transaction")
			return
		}
	}

	incident, err := queries.CreateDamageLostIncident(c.Request.Context(), sqlcdb.CreateDamageLostIncidentParams{
		TransactionID: transaction.ID,
		CopyID:        copyID,
		StudentID:     fromPgUUID(transaction.StudentID),
		IncidentType:  incidentType,
		Severity:      severity,
		Description:   toPgText(req.Description),
		AssessedCost:  toPgNumeric(req.AssessedCost),
		ReceiptNo:     toPgText(receiptNo),
		ReportedBy:    toPgUUID(librarian.ID),
		ReportedAt:    toPgTimestamp(time.Now()),
		Status:        "pending",
	})
	if err != nil {
		response.InternalError(c, "Failed to create incident")
		return
	}

	fineType := sqlcdb.FineTypeDamaged
	if incidentType == "lost" {
		fineType = sqlcdb.FineTypeLost
	}

	var fine *sqlcdb.Fine
	if req.AssessedCost > 0 {
		createdFine, fineErr := queries.CreateFineForIncident(c.Request.Context(), sqlcdb.CreateFineForIncidentParams{
			TransactionID: toPgUUID(transaction.ID),
			StudentID:     transaction.StudentID,
			Amount:        toPgNumeric(req.AssessedCost),
			FineType:      fineType,
			Description:   toPgText(req.Description),
		})
		if fineErr != nil {
			response.InternalError(c, "Failed to create fine")
			return
		}
		fine = &createdFine
	}

	if err := tx.Commit(c.Request.Context()); err != nil {
		response.InternalError(c, "Failed to report incident")
		return
	}

	h.invalidateDamageLostCaches()

	transactionStatus := ""
	if updatedTransaction.Status.Valid {
		transactionStatus = string(updatedTransaction.Status.TransactionStatus)
	}

	responseData := gin.H{
		"id":             incident.ID.String(),
		"transaction_id": transaction.ID.String(),
		"copy_id":        copy.ID.String(),
		"student_id":     fromPgUUID(transaction.StudentID).String(),
		"incident_type":  incident.IncidentType,
		"severity":       incident.Severity,
		"description":    fromPgText(incident.Description),
		"assessed_cost":  fromPgNumeric(incident.AssessedCost),
		"receipt_no":     fromPgText(incident.ReceiptNo),
		"status":         incident.Status,
		"reported_at":    formatPgTimestamp(incident.ReportedAt, time.RFC3339),
		"book_title":     transaction.BookTitle,
		"student_name":   transaction.StudentName,
		"copy_number":    copy.CopyNumber,
		"transaction": gin.H{
			"status":                 transactionStatus,
			"circulation_status":     updatedTransaction.CirculationStatus,
			"replacement_cost":       fromPgNumeric(updatedTransaction.ReplacementCostApplied),
			"transaction_receipt_no": fromPgText(updatedTransaction.ReceiptNo),
		},
	}

	if fine != nil {
		responseData["fine"] = gin.H{
			"id":          fine.ID.String(),
			"amount":      fromPgNumeric(fine.Amount),
			"fine_type":   string(fine.FineType),
			"description": fromPgText(fine.Description),
		}
	}

	LogAuditFromContext(c, h.queries, sqlcdb.AuditActionUpdate, "damage_lost_incident", incident.ID, map[string]interface{}{
		"incident_type": incidentType,
		"receipt_no":    receiptNo,
	})

	response.Success(c, responseData, "Incident reported successfully")
}

func (h *DamageLostHandler) ListIncidents(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	perPage, _ := strconv.Atoi(c.DefaultQuery("per_page", "20"))
	if perPage > 100 {
		perPage = 100
	}
	offset := (page - 1) * perPage

	incidentTypeFilter := strings.ToLower(strings.TrimSpace(c.Query("incident_type")))
	statusFilter := strings.ToLower(strings.TrimSpace(c.Query("status")))
	studentIDFilter := strings.TrimSpace(c.Query("student_id"))
	dateFromFilter := strings.TrimSpace(c.Query("date_from"))
	dateToFilter := strings.TrimSpace(c.Query("date_to"))

	incidents, err := h.queries.ListDamageLostIncidents(c.Request.Context())
	if err != nil {
		response.InternalError(c, "Failed to fetch incidents")
		return
	}

	filtered := make([]gin.H, 0, len(incidents))
	for _, incident := range incidents {
		if incidentTypeFilter != "" && incident.IncidentType != incidentTypeFilter {
			continue
		}
		if statusFilter != "" && incident.Status != statusFilter {
			continue
		}
		if studentIDFilter != "" && incident.StudentID.String() != studentIDFilter && incident.StudentNumber != studentIDFilter {
			continue
		}

		reportedAt := fromPgTimestamp(incident.ReportedAt)
		if dateFromFilter != "" {
			dateFrom, parseErr := time.Parse("2006-01-02", dateFromFilter)
			if parseErr == nil && reportedAt.Before(dateFrom) {
				continue
			}
		}
		if dateToFilter != "" {
			dateTo, parseErr := time.Parse("2006-01-02", dateToFilter)
			if parseErr == nil && reportedAt.After(dateTo.Add(24*time.Hour-time.Nanosecond)) {
				continue
			}
		}

		filtered = append(filtered, gin.H{
			"id":                     incident.ID.String(),
			"transaction_id":         incident.TransactionID.String(),
			"copy_id":                incident.CopyID.String(),
			"student_id":             incident.StudentID.String(),
			"student_name":           incident.StudentName,
			"student_number":         incident.StudentNumber,
			"book_title":             incident.BookTitle,
			"book_author":            incident.BookAuthor,
			"copy_number":            incident.CopyNumber,
			"incident_type":          incident.IncidentType,
			"severity":               incident.Severity,
			"description":            fromPgText(incident.Description),
			"assessed_cost":          fromPgNumeric(incident.AssessedCost),
			"receipt_no":             fromPgText(incident.ReceiptNo),
			"transaction_receipt_no": fromPgText(incident.TransactionReceiptNo),
			"circulation_status":     incident.CirculationStatus,
			"transaction_status":     getTransactionStatus(incident.TransactionStatus),
			"status":                 incident.Status,
			"reported_at":            formatPgTimestamp(incident.ReportedAt, time.RFC3339),
		})
	}

	end := offset + perPage
	if offset > len(filtered) {
		offset = len(filtered)
	}
	if end > len(filtered) {
		end = len(filtered)
	}
	paged := filtered[offset:end]

	response.SuccessWithMeta(c, paged, &response.Meta{
		Page:    page,
		PerPage: perPage,
		Total:   int64(len(filtered)),
	})
}

func (h *DamageLostHandler) GetIncident(c *gin.Context) {
	incidentID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "Invalid incident ID")
		return
	}

	incidents, err := h.queries.ListDamageLostIncidents(c.Request.Context())
	if err != nil {
		response.InternalError(c, "Failed to fetch incidents")
		return
	}

	for _, incident := range incidents {
		if incident.ID != incidentID {
			continue
		}

		transaction, txnErr := h.queries.GetTransactionWithCirculationStatus(c.Request.Context(), incident.TransactionID)
		if txnErr != nil {
			response.InternalError(c, "Failed to fetch incident details")
			return
		}

		response.Success(c, gin.H{
			"id":                     incident.ID.String(),
			"transaction_id":         incident.TransactionID.String(),
			"copy_id":                incident.CopyID.String(),
			"student_id":             incident.StudentID.String(),
			"student_name":           incident.StudentName,
			"student_number":         incident.StudentNumber,
			"grade_level":            incident.GradeLevel,
			"book_title":             incident.BookTitle,
			"book_author":            incident.BookAuthor,
			"copy_number":            incident.CopyNumber,
			"qr_code":                transaction.QrCode,
			"incident_type":          incident.IncidentType,
			"severity":               incident.Severity,
			"description":            fromPgText(incident.Description),
			"assessed_cost":          fromPgNumeric(incident.AssessedCost),
			"receipt_no":             fromPgText(incident.ReceiptNo),
			"transaction_receipt_no": fromPgText(incident.TransactionReceiptNo),
			"circulation_status":     incident.CirculationStatus,
			"transaction_status":     getTransactionStatus(incident.TransactionStatus),
			"status":                 incident.Status,
			"reported_at":            formatPgTimestamp(incident.ReportedAt, time.RFC3339),
			"checkout_date":          formatPgTimestamp(transaction.CheckoutDate, time.RFC3339),
			"due_date":               formatPgDate(transaction.DueDate, "2006-01-02"),
			"return_date":            formatPgTimestamp(transaction.ReturnDate, time.RFC3339),
		}, "")
		return
	}

	response.NotFound(c, "Incident not found")
}

func (h *DamageLostHandler) ResolveIncident(c *gin.Context) {
	incidentID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "Invalid incident ID")
		return
	}

	commandTag, err := h.db.Exec(c.Request.Context(), `
		UPDATE damage_lost_incidents
		SET status = 'resolved'
		WHERE id = $1
	`, incidentID)
	if err != nil {
		response.InternalError(c, "Failed to resolve incident")
		return
	}

	if commandTag.RowsAffected() == 0 {
		response.NotFound(c, "Incident not found")
		return
	}

	h.invalidateDamageLostCaches()

	LogAuditFromContext(c, h.queries, sqlcdb.AuditActionUpdate, "damage_lost_incident", incidentID, map[string]interface{}{
		"status": "resolved",
	})

	response.Success(c, gin.H{"id": incidentID.String(), "status": "resolved"}, "Incident resolved successfully")
}
