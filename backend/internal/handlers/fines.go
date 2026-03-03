package handlers

import (
	"math"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/holyredeemer/library-api/internal/cache"
	"github.com/holyredeemer/library-api/internal/middleware"
	"github.com/holyredeemer/library-api/internal/repositories/sqlcdb"
	"github.com/holyredeemer/library-api/pkg/response"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
)

type FineHandler struct {
	queries *sqlcdb.Queries
	db      *pgxpool.Pool
	cache   *cache.Cache
}

func NewFineHandler(queries *sqlcdb.Queries, db *pgxpool.Pool, cache *cache.Cache) *FineHandler {
	return &FineHandler{queries: queries, db: db, cache: cache}
}

func (h *FineHandler) invalidateDashboardCache() {
	h.cache.Delete(cache.DashboardStatsKey)
}

// ListFines returns paginated list of fines
func (h *FineHandler) ListFines(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	perPage, _ := strconv.Atoi(c.DefaultQuery("per_page", "20"))
	offset := (page - 1) * perPage

	status := c.Query("status")
	studentIDStr := c.Query("student_id")

	var studentID = pgtype.UUID{Valid: false}
	if studentIDStr != "" {
		if id, err := uuid.Parse(studentIDStr); err == nil {
			studentID = toPgUUID(id)
		}
	}

	fines, err := h.queries.ListFines(c.Request.Context(), sqlcdb.ListFinesParams{
		Limit:     int32(perPage),
		Offset:    int32(offset),
		StudentID: studentID,
		Status:    toPgFineStatus(status),
	})
	if err != nil {
		response.InternalError(c, "Failed to fetch fines")
		return
	}

	total, _ := h.queries.CountFines(c.Request.Context(), sqlcdb.CountFinesParams{
		StudentID: studentID,
		Status:    toPgFineStatus(status),
	})

	fineResponses := make([]gin.H, len(fines))
	for i, f := range fines {
		fineResponses[i] = gin.H{
			"id":             f.ID.String(),
			"student_id":     fromPgUUID(f.StudentID).String(),
			"student_name":   f.StudentName,
			"student_number": f.StudentNumber,
			"book_title":     fromPgText(f.BookTitle),
			"amount":         fromPgNumeric(f.Amount),
			"fine_type":      string(f.FineType),
			"description":    fromPgText(f.Description),
			"status":         getFineStatus(f.Status),
			"created_at":     fromPgTimestamp(f.CreatedAt),
		}
		if f.TransactionID.Valid {
			fineResponses[i]["transaction_id"] = uuid.UUID(f.TransactionID.Bytes).String()
		}
	}

	response.SuccessWithMeta(c, fineResponses, &response.Meta{
		Page:    page,
		PerPage: perPage,
		Total:   total,
	})
}

// GetFine returns a single fine by ID
func (h *FineHandler) GetFine(c *gin.Context) {
	fineID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "Invalid fine ID")
		return
	}

	fine, err := h.queries.GetFineByID(c.Request.Context(), fineID)
	if err != nil {
		response.NotFound(c, "Fine not found")
		return
	}

	// Get payments for this fine
	payments, _ := h.queries.ListPaymentsByFine(c.Request.Context(), toPgUUID(fine.ID))
	totalPaid, _ := h.queries.GetTotalPaidForFine(c.Request.Context(), toPgUUID(fine.ID))

	paymentList := make([]gin.H, len(payments))
	for i, p := range payments {
		paymentList[i] = gin.H{
			"id":          p.ID.String(),
			"amount":      fromPgNumeric(p.Amount),
			"method":      string(p.PaymentMethod),
			"reference":   fromPgText(p.ReferenceNumber),
			"processedBy": fromPgText(p.ProcessedByName),
			"paymentDate": fromPgTimestamp(p.PaymentDate),
		}
	}

	fineAmount := fromPgNumeric(fine.Amount)
	response.Success(c, gin.H{
		"id":            fine.ID.String(),
		"studentId":     fromPgUUID(fine.StudentID).String(),
		"studentName":   fine.StudentName,
		"studentNumber": fine.StudentNumber,
		"bookTitle":     fromPgText(fine.BookTitle),
		"amount":        fineAmount,
		"type":          string(fine.FineType),
		"description":   fromPgText(fine.Description),
		"status":        getFineStatus(fine.Status),
		"totalPaid":     totalPaid,
		"remaining":     fineAmount - totalPaid,
		"payments":      paymentList,
		"createdAt":     fromPgTimestamp(fine.CreatedAt),
	}, "")
}

// PayFineRequest represents the payment request
type PayFineRequest struct {
	Amount          float64 `json:"amount" binding:"required"`
	PaymentMethod   string  `json:"payment_method"`
	ReferenceNumber string  `json:"reference_number"`
	Notes           string  `json:"notes"`
}

// PayFine records a payment for a fine
func (h *FineHandler) PayFine(c *gin.Context) {
	fineID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "Invalid fine ID")
		return
	}

	var req PayFineRequest
	if bindErr := c.ShouldBindJSON(&req); bindErr != nil {
		response.BadRequest(c, "Invalid request body")
		return
	}

	authUser := middleware.GetAuthUser(c)
	if authUser == nil {
		response.Unauthorized(c, "User not authenticated")
		return
	}

	method := strings.ToLower(strings.TrimSpace(req.PaymentMethod))
	if method == "" {
		method = string(sqlcdb.PaymentMethodCash)
	}
	switch method {
	case string(sqlcdb.PaymentMethodCash),
		string(sqlcdb.PaymentMethodGcash),
		string(sqlcdb.PaymentMethodBankTransfer),
		string(sqlcdb.PaymentMethodOther):
	default:
		response.BadRequest(c, "Invalid payment method")
		return
	}

	// Get fine
	fine, err := h.queries.GetFineByID(c.Request.Context(), fineID)
	if err != nil {
		response.NotFound(c, "Fine not found")
		return
	}

	if fine.Status.Valid && fine.Status.FineStatus == sqlcdb.FineStatusPaid {
		response.BadRequest(c, "Fine is already paid")
		return
	}

	if fine.Status.Valid && fine.Status.FineStatus == sqlcdb.FineStatusWaived {
		response.BadRequest(c, "Fine has been waived")
		return
	}

	// Get librarian ID
	librarianUserID, _ := uuid.Parse(authUser.ID)
	librarian, err := h.queries.GetLibrarianByUserID(c.Request.Context(), toPgUUID(librarianUserID))
	var librarianID = pgtype.UUID{Valid: false}
	if err == nil {
		librarianID = toPgUUID(librarian.ID)
	}

	fineAmount := fromPgNumeric(fine.Amount)
	paymentAmount := req.Amount
	if paymentAmount <= 0 || math.IsNaN(paymentAmount) || math.IsInf(paymentAmount, 0) {
		paymentAmount = fineAmount
	}

	// Begin transaction for atomic payment + status update
	tx, err := h.db.Begin(c.Request.Context())
	if err != nil {
		response.InternalError(c, "Failed to begin transaction")
		return
	}
	defer tx.Rollback(c.Request.Context())

	queries := h.queries.WithTx(tx)

	// Create payment
	payment, err := queries.CreatePayment(c.Request.Context(), sqlcdb.CreatePaymentParams{
		FineID:          toPgUUID(fineID),
		StudentID:       fine.StudentID,
		Amount:          toPgNumeric(paymentAmount),
		PaymentMethod:   sqlcdb.PaymentMethod(method),
		ReferenceNumber: toPgText(req.ReferenceNumber),
		Notes:           toPgText(req.Notes),
		ProcessedBy:     librarianID,
	})
	if err != nil {
		response.InternalError(c, "Failed to record payment")
		return
	}

	// Check if fine is fully paid
	totalPaid, _ := queries.GetTotalPaidForFine(c.Request.Context(), toPgUUID(fineID))
	if totalPaid >= fineAmount {
		_, err := queries.UpdateFineStatus(c.Request.Context(), sqlcdb.UpdateFineStatusParams{
			ID:     fineID,
			Status: sqlcdb.NullFineStatus{FineStatus: sqlcdb.FineStatusPaid, Valid: true},
		})
		if err != nil {
			response.InternalError(c, "Failed to update fine status")
			return
		}
	} else if totalPaid > 0 {
		_, err := queries.UpdateFineStatus(c.Request.Context(), sqlcdb.UpdateFineStatusParams{
			ID:     fineID,
			Status: sqlcdb.NullFineStatus{FineStatus: sqlcdb.FineStatusPartial, Valid: true},
		})
		if err != nil {
			response.InternalError(c, "Failed to update fine status")
			return
		}
	}

	if err := tx.Commit(c.Request.Context()); err != nil {
		response.InternalError(c, "Failed to record payment")
		return
	}

	h.invalidateDashboardCache()
	LogAuditFromContext(c, h.queries, sqlcdb.AuditActionPaymentReceived, "fine", fineID, map[string]interface{}{
		"amount":         paymentAmount,
		"payment_method": method,
		"new_status":     "paid",
		"total_paid":     totalPaid,
	})

	response.Success(c, gin.H{
		"payment_id": payment.ID.String(),
		"amount":     req.Amount,
		"total_paid": totalPaid,
		"remaining":  fineAmount - totalPaid,
	}, "Payment recorded successfully")
}

// WaiveFine waives a fine (admin only)
func (h *FineHandler) WaiveFine(c *gin.Context) {
	fineID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "Invalid fine ID")
		return
	}

	// Get fine
	fine, err := h.queries.GetFineByID(c.Request.Context(), fineID)
	if err != nil {
		response.NotFound(c, "Fine not found")
		return
	}

	if fine.Status.Valid && fine.Status.FineStatus == sqlcdb.FineStatusPaid {
		response.BadRequest(c, "Cannot waive a paid fine")
		return
	}

	_, err = h.queries.UpdateFineStatus(c.Request.Context(), sqlcdb.UpdateFineStatusParams{
		ID:     fineID,
		Status: sqlcdb.NullFineStatus{FineStatus: sqlcdb.FineStatusWaived, Valid: true},
	})
	if err != nil {
		response.InternalError(c, "Failed to waive fine")
		return
	}

	h.invalidateDashboardCache()
	LogAuditFromContext(c, h.queries, sqlcdb.AuditActionUpdate, "fine", fineID, map[string]interface{}{
		"new_status": "waived",
	})

	response.Success(c, nil, "Fine waived successfully")
}
