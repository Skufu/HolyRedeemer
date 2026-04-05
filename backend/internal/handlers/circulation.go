package handlers

import (
	"context"
	"fmt"
	"log"
	"math/rand"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/holyredeemer/library-api/internal/cache"
	"github.com/holyredeemer/library-api/internal/config"
	"github.com/holyredeemer/library-api/internal/middleware"
	"github.com/holyredeemer/library-api/internal/repositories/sqlcdb"
	"github.com/holyredeemer/library-api/pkg/response"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
)

type CirculationHandler struct {
	queries *sqlcdb.Queries
	config  *config.Config
	db      *pgxpool.Pool
	cache   *cache.Cache
}

func NewCirculationHandler(queries *sqlcdb.Queries, cfg *config.Config, db *pgxpool.Pool, cache *cache.Cache) *CirculationHandler {
	return &CirculationHandler{
		queries: queries,
		config:  cfg,
		db:      db,
		cache:   cache,
	}
}

func (h *CirculationHandler) invalidateCirculationCaches() {
	h.cache.DeletePrefix(cache.BooksListPrefix)
	h.cache.DeletePrefix(cache.BookDetailPrefix)
	h.cache.Delete(cache.DashboardStatsKey)
}

func generateReceiptNo() string {
	r := rand.New(rand.NewSource(time.Now().UnixNano()))
	return fmt.Sprintf("RCT-%s-%04d", time.Now().Format("20060102"), r.Intn(10000))
}

type nextReservationInfo struct {
	RequestID   uuid.UUID
	UserID      uuid.UUID
	StudentName string
}

func (h *CirculationHandler) getNextPendingReservationForBook(ctx context.Context, bookID uuid.UUID) (*nextReservationInfo, error) {
	row := h.db.QueryRow(ctx, `
		SELECT br.id, u.id, u.name
		FROM book_requests br
		JOIN students s ON br.student_id = s.id
		JOIN users u ON s.user_id = u.id
		WHERE br.book_id = $1
		  AND br.request_type = 'reservation'
		  AND br.status = 'pending'
		ORDER BY br.request_date ASC
		LIMIT 1
	`, bookID)

	var info nextReservationInfo
	if err := row.Scan(&info.RequestID, &info.UserID, &info.StudentName); err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}

	return &info, nil
}

// CheckoutRequest represents the checkout request
type CheckoutRequest struct {
	StudentID string `json:"student_id" binding:"required"`
	CopyID    string `json:"copy_id" binding:"required"`
	DueDate   string `json:"due_date"` // Optional, uses default if not provided
	Notes     string `json:"notes"`
}

// CheckoutResponse represents the checkout response
type CheckoutResponse struct {
	TransactionID string `json:"transaction_id"`
	Student       struct {
		Name      string `json:"name"`
		StudentID string `json:"student_id"`
	} `json:"student"`
	Book struct {
		Title      string `json:"title"`
		CopyNumber int32  `json:"copy_number"`
	} `json:"book"`
	CheckoutDate string `json:"checkout_date"`
	DueDate      string `json:"due_date"`
}

// Checkout processes a book checkout
func (h *CirculationHandler) Checkout(c *gin.Context) {
	var req CheckoutRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request body")
		return
	}

	studentID, err := uuid.Parse(req.StudentID)
	if err != nil {
		response.BadRequest(c, "Invalid student ID")
		return
	}

	copyID, err := uuid.Parse(req.CopyID)
	if err != nil {
		response.BadRequest(c, "Invalid copy ID")
		return
	}

	// Get librarian ID from auth
	authUser := middleware.GetAuthUser(c)

	// Explicit role check for defense-in-depth
	if authUser.Role != "librarian" && authUser.Role != "admin" && authUser.Role != "super_admin" {
		response.Forbidden(c, "Insufficient permissions")
		return
	}

	librarianUserID, _ := uuid.Parse(authUser.ID)
	librarian, err := h.queries.GetLibrarianByUserID(c.Request.Context(), toPgUUID(librarianUserID))
	librarianID := pgtype.UUID{Valid: false}
	if err == nil {
		librarianID = toPgUUID(librarian.ID)
	}

	// Begin transaction BEFORE validation
	tx, err := h.db.Begin(c.Request.Context())
	if err != nil {
		response.InternalError(c, "Failed to begin transaction")
		return
	}
	defer func() {
		_ = tx.Rollback(c.Request.Context())
	}()

	// Use transactional queries
	queries := h.queries.WithTx(tx)

	// Validate student
	student, err := queries.GetStudentByID(c.Request.Context(), studentID)
	if err != nil {
		response.NotFound(c, "Student not found")
		return
	}

	if !isStudentStatusActive(student.Status) {
		response.BadRequest(c, "Student account is not active")
		return
	}

	// Check student's current loans within transaction
	currentLoans, err := queries.GetStudentCurrentLoans(c.Request.Context(), toPgUUID(studentID))
	if err != nil {
		response.InternalError(c, "Failed to check current loans")
		return
	}
	if currentLoans >= int64(h.config.DefaultMaxBooks) {
		response.BadRequest(c, "Student has reached maximum allowed loans")
		return
	}

	// Check student's fines within transaction
	totalFines, err := queries.GetStudentTotalFines(c.Request.Context(), toPgUUID(studentID))
	if err != nil {
		response.InternalError(c, "Failed to check fines")
		return
	}
	if totalFines >= h.config.DefaultBlockThreshold {
		response.BadRequest(c, "Student is blocked due to unpaid fines")
		return
	}

	// Validate copy with row lock
	copy, err := queries.GetCopyByIDForUpdate(c.Request.Context(), copyID)
	if err != nil {
		response.NotFound(c, "Book copy not found")
		return
	}

	if !copy.Status.Valid || (copy.Status.CopyStatus != sqlcdb.CopyStatusAvailable && copy.Status.CopyStatus != sqlcdb.CopyStatusReserved) {
		response.BadRequest(c, "Book copy is not available")
		return
	}

	// Calculate due date
	dueDate := time.Now().AddDate(0, 0, h.config.DefaultLoanDays)
	if req.DueDate != "" {
		if parsed, parseErr := time.Parse("2006-01-02", req.DueDate); parseErr == nil {
			dueDate = parsed
		}
	}

	// Create transaction
	txn, err := queries.CreateTransaction(c.Request.Context(), sqlcdb.CreateTransactionParams{
		StudentID:      toPgUUID(studentID),
		CopyID:         toPgUUID(copyID),
		LibrarianID:    librarianID,
		CheckoutDate:   toPgTimestamp(time.Now()),
		DueDate:        toPgDate(dueDate),
		Status:         sqlcdb.NullTransactionStatus{TransactionStatus: sqlcdb.TransactionStatusBorrowed, Valid: true},
		CheckoutMethod: sqlcdb.NullCheckoutMethod{CheckoutMethod: sqlcdb.CheckoutMethodCounter, Valid: true},
		Notes:          toPgText(req.Notes),
	})
	if err != nil {
		response.InternalError(c, "Failed to create transaction")
		return
	}

	// Update copy status
	err = queries.UpdateCopyStatus(c.Request.Context(), sqlcdb.UpdateCopyStatusParams{
		ID:     copyID,
		Status: sqlcdb.NullCopyStatus{CopyStatus: sqlcdb.CopyStatusBorrowed, Valid: true},
	})
	if err != nil {
		response.InternalError(c, "Failed to update copy status")
		return
	}

	// Commit transaction
	if err := tx.Commit(c.Request.Context()); err != nil {
		log.Printf("Failed to commit transaction: %v", err)
		response.InternalError(c, "Failed to complete checkout")
		return
	}

	h.invalidateCirculationCaches()

	// If there was a matching approved reservation, mark it as fulfilled
	_ = h.queries.FulfillReservation(c.Request.Context(), sqlcdb.FulfillReservationParams{
		StudentID: toPgUUID(studentID),
		BookID:    copy.BookID,
	})

	if copy.BookID.Valid {
		if err := CancelPendingReservationsForBook(c.Request.Context(), h.db, fromPgUUID(copy.BookID)); err != nil {
			log.Printf("Failed to auto-cancel pending reservations for book %s: %v", fromPgUUID(copy.BookID), err)
		}
	}

	resp := CheckoutResponse{
		TransactionID: txn.ID.String(),
		CheckoutDate:  formatPgTimestamp(txn.CheckoutDate, time.RFC3339),
		DueDate:       formatPgDate(txn.DueDate, "2006-01-02"),
	}
	resp.Student.Name = student.UserName
	resp.Student.StudentID = student.StudentID
	resp.Book.Title = copy.BookTitle
	resp.Book.CopyNumber = copy.CopyNumber

	// Log audit entry
	LogAuditFromContext(c, h.queries, sqlcdb.AuditActionCheckout, "transaction", txn.ID, map[string]interface{}{
		"student_id": student.StudentID,
		"book_title": copy.BookTitle,
	})

	response.Success(c, resp, "Book checked out successfully")
}

// ReturnRequest represents the return request
type ReturnRequest struct {
	CopyID    string `json:"copy_id" binding:"required"`
	Condition string `json:"condition"` // New condition after return
	Notes     string `json:"notes"`
}

// ReturnResponse represents the return response
type ReturnResponse struct {
	TransactionID string `json:"transaction_id"`
	ReceiptNo     string `json:"receipt_no"`
	ReturnDate    string `json:"return_date"`
	DaysOverdue   int    `json:"days_overdue"`
	Fine          *struct {
		ID     string  `json:"id"`
		Amount float64 `json:"amount"`
		Type   string  `json:"type"`
	} `json:"fine,omitempty"`
}

// Return processes a book return
func (h *CirculationHandler) Return(c *gin.Context) {
	var req ReturnRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request body")
		return
	}

	copyID, err := uuid.Parse(req.CopyID)
	if err != nil {
		response.BadRequest(c, "Invalid copy ID")
		return
	}

	// Get librarian ID from auth
	authUser := middleware.GetAuthUser(c)

	// Explicit role check for defense-in-depth
	if authUser.Role != "librarian" && authUser.Role != "admin" && authUser.Role != "super_admin" {
		response.Forbidden(c, "Insufficient permissions")
		return
	}

	librarianUserID, _ := uuid.Parse(authUser.ID)
	librarianID := pgtype.UUID{Valid: false}

	// Begin transaction BEFORE validation
	tx, err := h.db.Begin(c.Request.Context())
	if err != nil {
		response.InternalError(c, "Failed to begin transaction")
		return
	}
	defer func() {
		_ = tx.Rollback(c.Request.Context())
	}()

	// Use transactional queries
	queries := h.queries.WithTx(tx)

	librarian, err := queries.GetLibrarianByUserID(c.Request.Context(), toPgUUID(librarianUserID))
	if err == nil {
		librarianID = toPgUUID(librarian.ID)
	}

	// Find active loan for this copy WITH row lock
	loan, err := queries.GetActiveLoanByCopyForUpdate(c.Request.Context(), toPgUUID(copyID))
	if err != nil {
		response.NotFound(c, "No active loan found for this copy")
		return
	}

	// Determine return condition
	returnCondition := sqlcdb.NullCopyCondition{CopyCondition: sqlcdb.CopyConditionGood, Valid: true}
	if req.Condition != "" {
		returnCondition = sqlcdb.NullCopyCondition{CopyCondition: sqlcdb.CopyCondition(req.Condition), Valid: true}
	}

	// Update transaction
	now := time.Now()
	receiptNo := generateReceiptNo()
	_, err = queries.UpdateTransactionReturn(c.Request.Context(), sqlcdb.UpdateTransactionReturnParams{
		ID:              loan.ID,
		ReturnDate:      toPgTimestampNullable(now, true),
		ReturnedBy:      librarianID,
		ReturnCondition: returnCondition,
		Notes:           toPgText(req.Notes),
	})
	if err != nil {
		response.InternalError(c, "Failed to process return")
		return
	}

	if returnCondition.Valid && returnCondition.CopyCondition == sqlcdb.CopyConditionPoor {
		if _, err = tx.Exec(c.Request.Context(), `
			UPDATE transactions
			SET circulation_status = 'damaged',
			    incident_type = 'damage',
			    receipt_no = $2
			WHERE id = $1
		`, loan.ID, receiptNo); err != nil {
			response.InternalError(c, "Failed to update return receipt")
			return
		}
	} else {
		if _, err = tx.Exec(c.Request.Context(), `
			UPDATE transactions
			SET circulation_status = 'returned',
			    receipt_no = $2
			WHERE id = $1
		`, loan.ID, receiptNo); err != nil {
			response.InternalError(c, "Failed to update return receipt")
			return
		}
	}

	// Update copy status
	newStatus := sqlcdb.NullCopyStatus{CopyStatus: sqlcdb.CopyStatusAvailable, Valid: true}
	if returnCondition.Valid && returnCondition.CopyCondition == sqlcdb.CopyConditionPoor {
		newStatus = sqlcdb.NullCopyStatus{CopyStatus: sqlcdb.CopyStatusDamaged, Valid: true}
	}
	err = queries.UpdateCopyStatus(c.Request.Context(), sqlcdb.UpdateCopyStatusParams{
		ID:     copyID,
		Status: newStatus,
	})
	if err != nil {
		response.InternalError(c, "Failed to update copy status")
		return
	}

	// Check for overdue and create fine if needed
	resp := ReturnResponse{
		TransactionID: loan.ID.String(),
		ReceiptNo:     receiptNo,
		ReturnDate:    now.Format(time.RFC3339),
		DaysOverdue:   0,
	}

	loanDueDate := fromPgDate(loan.DueDate)
	if loanDueDate.Before(now.Truncate(24 * time.Hour)) {
		daysOverdue := int(now.Truncate(24*time.Hour).Sub(loanDueDate).Hours() / 24)
		if daysOverdue > h.config.DefaultGracePeriod {
			daysOverdue -= h.config.DefaultGracePeriod
		}

		if daysOverdue > 0 {
			resp.DaysOverdue = daysOverdue
			fineAmount := float64(daysOverdue) * h.config.DefaultFinePerDay
			if fineAmount > h.config.DefaultMaxFineCap {
				fineAmount = h.config.DefaultMaxFineCap
			}

			fine, fineErr := queries.CreateFine(c.Request.Context(), sqlcdb.CreateFineParams{
				TransactionID: toPgUUID(loan.ID),
				StudentID:     loan.StudentID,
				Amount:        toPgNumeric(fineAmount),
				FineType:      sqlcdb.FineTypeOverdue,
				Description:   toPgText(""),
				Status:        sqlcdb.NullFineStatus{FineStatus: sqlcdb.FineStatusPending, Valid: true},
			})
			if fineErr == nil {
				resp.Fine = &struct {
					ID     string  `json:"id"`
					Amount float64 `json:"amount"`
					Type   string  `json:"type"`
				}{
					ID:     fine.ID.String(),
					Amount: fineAmount,
					Type:   "overdue",
				}
			} else {
				log.Printf("Failed to create fine: %v", fineErr)
			}
		}
	}

	// Commit transaction
	if commitErr := tx.Commit(c.Request.Context()); commitErr != nil {
		log.Printf("Failed to commit transaction: %v", commitErr)
		response.InternalError(c, "Failed to complete return")
		return
	}

	h.invalidateCirculationCaches()

	copy, err := h.queries.GetCopyByID(c.Request.Context(), copyID)
	if err == nil && copy.BookID.Valid {
		nextReservation, reservationErr := h.getNextPendingReservationForBook(c.Request.Context(), fromPgUUID(copy.BookID))
		if reservationErr != nil {
			log.Printf("Failed to check pending reservations for book %s: %v", fromPgUUID(copy.BookID), reservationErr)
		} else if nextReservation != nil {
			_, notifyErr := h.queries.CreateNotification(c.Request.Context(), sqlcdb.CreateNotificationParams{
				UserID:        toPgUUID(nextReservation.UserID),
				Type:          sqlcdb.NotificationTypeRequestUpdate,
				Title:         "Reserved Book Now Available",
				Message:       fmt.Sprintf("Good news, %s! A copy of '%s' has been returned and is now available for you.", nextReservation.StudentName, copy.BookTitle),
				ReferenceType: toPgText("request"),
				ReferenceID:   toPgUUID(nextReservation.RequestID),
			})
			if notifyErr != nil {
				log.Printf("Failed to notify next reservation in queue: %v", notifyErr)
			}
		}
	}

	// Log audit entry
	LogAuditFromContext(c, h.queries, sqlcdb.AuditActionReturn, "transaction", loan.ID, map[string]interface{}{
		"receipt_no":   resp.ReceiptNo,
		"days_overdue": resp.DaysOverdue,
	})

	response.Success(c, resp, "Book returned successfully")
}

// RenewRequest represents the renew request
type RenewRequest struct {
	TransactionID string `json:"transaction_id" binding:"required"`
}

// Renew extends the due date for a loan
func (h *CirculationHandler) Renew(c *gin.Context) {
	var req RenewRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request body")
		return
	}

	txnID, err := uuid.Parse(req.TransactionID)
	if err != nil {
		response.BadRequest(c, "Invalid transaction ID")
		return
	}

	// Begin transaction BEFORE validation
	tx, err := h.db.Begin(c.Request.Context())
	if err != nil {
		response.InternalError(c, "Failed to begin transaction")
		return
	}
	defer func() {
		_ = tx.Rollback(c.Request.Context())
	}()

	// Use transactional queries
	queries := h.queries.WithTx(tx)

	// Get transaction WITH row lock
	txn, err := queries.GetTransactionByIDForUpdate(c.Request.Context(), txnID)
	if err != nil {
		response.NotFound(c, "Transaction not found")
		return
	}

	// Check authorization
	authUser := middleware.GetAuthUser(c)
	if authUser.Role == "student" {
		student, _ := queries.GetStudentByUserID(c.Request.Context(), toPgUUID(uuid.MustParse(authUser.ID)))
		// ✅ CORRECT: Compare student IDs, not student ID vs transaction ID
		if student.ID != fromPgUUID(txn.StudentID) {
			response.Forbidden(c, "Cannot renew other student's loans")
			return
		}
	}

	// Check status
	if txn.Status.Valid && txn.Status.TransactionStatus == sqlcdb.TransactionStatusReturned {
		response.BadRequest(c, "Cannot renew a returned book")
		return
	}

	// Check renewal limit
	if fromPgInt4(txn.RenewalCount) >= 2 { // Max 2 renewals
		response.BadRequest(c, "Maximum renewal limit reached")
		return
	}

	// Calculate new due date
	newDueDate := time.Now().AddDate(0, 0, h.config.DefaultLoanDays)

	_, err = queries.RenewTransaction(c.Request.Context(), sqlcdb.RenewTransactionParams{
		ID:      txnID,
		DueDate: toPgDate(newDueDate),
	})
	if err != nil {
		response.InternalError(c, "Failed to renew loan")
		return
	}

	// Update overdue status if was overdue
	if txn.Status.Valid && txn.Status.TransactionStatus == sqlcdb.TransactionStatusOverdue {
		err = queries.UpdateTransactionStatus(c.Request.Context(), sqlcdb.UpdateTransactionStatusParams{
			ID:     txnID,
			Status: sqlcdb.NullTransactionStatus{TransactionStatus: sqlcdb.TransactionStatusBorrowed, Valid: true},
		})
		if err != nil {
			log.Printf("Failed to update transaction status: %v", err)
			response.InternalError(c, "Failed to update transaction status")
			return
		}
	}

	// Commit transaction
	if err := tx.Commit(c.Request.Context()); err != nil {
		log.Printf("Failed to commit transaction: %v", err)
		response.InternalError(c, "Failed to complete renewal")
		return
	}

	h.invalidateCirculationCaches()

	response.Success(c, gin.H{
		"new_due_date":  newDueDate.Format("2006-01-02"),
		"renewal_count": fromPgInt4(txn.RenewalCount) + 1,
	}, "Loan renewed successfully")
}

// ActiveLoanResponse represents an active loan
type ActiveLoanResponse struct {
	ID           string `json:"id"`
	BookID       string `json:"bookId"`
	BookTitle    string `json:"bookTitle"`
	BookAuthor   string `json:"bookAuthor"`
	CopyNumber   int32  `json:"copyNumber"`
	QRCode       string `json:"qrCode"`
	StudentID    string `json:"studentId"`
	StudentName  string `json:"studentName"`
	StudentNum   string `json:"studentNumber"`
	CheckoutDate string `json:"checkoutDate"`
	DueDate      string `json:"dueDate"`
	Status       string `json:"status"`
	RenewCount   int32  `json:"renewCount"`
}

// ListCurrentLoans returns all active loans
func (h *CirculationHandler) ListCurrentLoans(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	perPage, _ := strconv.Atoi(c.DefaultQuery("per_page", "50"))
	if perPage > 100 {
		perPage = 100
	}
	offset := (page - 1) * perPage

	loans, err := h.queries.ListActiveTransactions(c.Request.Context(), sqlcdb.ListActiveTransactionsParams{
		Limit:  int32(perPage),
		Offset: int32(offset),
	})
	if err != nil {
		response.InternalError(c, "Failed to fetch loans")
		return
	}

	loanResponses := make([]ActiveLoanResponse, len(loans))
	for i, l := range loans {
		loanResponses[i] = ActiveLoanResponse{
			ID:           l.ID.String(),
			BookID:       l.BookID.String(),
			BookTitle:    l.BookTitle,
			BookAuthor:   l.BookAuthor,
			CopyNumber:   l.CopyNumber,
			QRCode:       l.QrCode,
			StudentID:    l.StudentUuid.String(),
			StudentName:  l.StudentName,
			StudentNum:   l.StudentNumber,
			CheckoutDate: formatPgTimestamp(l.CheckoutDate, time.RFC3339),
			DueDate:      formatPgDate(l.DueDate, "2006-01-02"),
			Status:       getTransactionStatus(l.Status),
			RenewCount:   fromPgInt4(l.RenewalCount),
		}
	}

	total, _ := h.queries.CountActiveLoans(c.Request.Context())

	response.SuccessWithMeta(c, loanResponses, &response.Meta{
		Page:    page,
		PerPage: perPage,
		Total:   total,
	})
}

// OverdueLoanResponse represents an overdue loan
type OverdueLoanResponse struct {
	ActiveLoanResponse
	DaysOverdue int     `json:"daysOverdue"`
	FineAmount  float64 `json:"fineAmount"`
}

// ListOverdue returns all overdue loans
func (h *CirculationHandler) ListOverdue(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	perPage, _ := strconv.Atoi(c.DefaultQuery("per_page", "50"))
	if perPage > 100 {
		perPage = 100
	}
	offset := (page - 1) * perPage

	loans, err := h.queries.ListOverdueTransactions(c.Request.Context(), sqlcdb.ListOverdueTransactionsParams{
		Limit:  int32(perPage),
		Offset: int32(offset),
	})
	if err != nil {
		response.InternalError(c, "Failed to fetch overdue loans")
		return
	}

	loanResponses := make([]OverdueLoanResponse, len(loans))
	for i, l := range loans {
		daysOverdue := int(l.DaysOverdue)
		fineAmount := float64(daysOverdue) * h.config.DefaultFinePerDay
		if fineAmount > h.config.DefaultMaxFineCap {
			fineAmount = h.config.DefaultMaxFineCap
		}

		loanResponses[i] = OverdueLoanResponse{
			ActiveLoanResponse: ActiveLoanResponse{
				ID:           l.ID.String(),
				BookID:       l.BookID.String(),
				BookTitle:    l.BookTitle,
				BookAuthor:   l.BookAuthor,
				CopyNumber:   l.CopyNumber,
				QRCode:       l.QrCode,
				StudentID:    l.StudentUuid.String(),
				StudentName:  l.StudentName,
				StudentNum:   l.StudentNumber,
				CheckoutDate: formatPgTimestamp(l.CheckoutDate, time.RFC3339),
				DueDate:      formatPgDate(l.DueDate, "2006-01-02"),
				Status:       getTransactionStatus(l.Status),
				RenewCount:   fromPgInt4(l.RenewalCount),
			},
			DaysOverdue: daysOverdue,
			FineAmount:  fineAmount,
		}
	}

	total, _ := h.queries.CountOverdueLoans(c.Request.Context())

	response.SuccessWithMeta(c, loanResponses, &response.Meta{
		Page:    page,
		PerPage: perPage,
		Total:   total,
	})
}

// NotifyOverdue sends a notification to the student about an overdue book
func (h *CirculationHandler) NotifyOverdue(c *gin.Context) {
	txnID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "Invalid transaction ID")
		return
	}

	// Get transaction details
	txn, err := h.queries.GetTransactionByID(c.Request.Context(), txnID)
	if err != nil {
		response.NotFound(c, "Transaction not found")
		return
	}

	// Check if book is actually overdue
	dueDate := fromPgDate(txn.DueDate)
	now := time.Now()
	if !dueDate.Before(now.Truncate(24 * time.Hour)) {
		response.BadRequest(c, "Book is not overdue yet")
		return
	}

	// Get student info to get user_id
	student, err := h.queries.GetStudentByID(c.Request.Context(), fromPgUUID(txn.StudentID))
	if err != nil {
		response.NotFound(c, "Student not found")
		return
	}

	// Calculate current fine for the message
	daysOverdue := int(now.Truncate(24*time.Hour).Sub(dueDate).Hours() / 24)
	if daysOverdue > h.config.DefaultGracePeriod {
		daysOverdue -= h.config.DefaultGracePeriod
	}

	fineAmount := 0.0
	if daysOverdue > 0 {
		fineAmount = float64(daysOverdue) * h.config.DefaultFinePerDay
		if fineAmount > h.config.DefaultMaxFineCap {
			fineAmount = h.config.DefaultMaxFineCap
		}
	}

	// Create notification
	_, err = h.queries.CreateNotification(c.Request.Context(), sqlcdb.CreateNotificationParams{
		UserID: student.UserID,
		Type:   sqlcdb.NotificationTypeOverdue,
		Title:  "Overdue Book Reminder",
		Message: fmt.Sprintf("Reminder: The book '%s' was due on %s (%d days overdue). Please return it soon. Current fine: P%.2f",
			txn.BookTitle, dueDate.Format("Jan 02, 2006"), daysOverdue, fineAmount),
		ReferenceType: toPgText("transaction"),
		ReferenceID:   toPgUUID(txnID),
	})
	if err != nil {
		response.InternalError(c, "Failed to send notification")
		return
	}

	response.Success(c, nil, "Notification sent to student successfully")
}

// ListTransactions returns transaction history
func (h *CirculationHandler) ListTransactions(c *gin.Context) {
	h.ListCurrentLoans(c)
}
