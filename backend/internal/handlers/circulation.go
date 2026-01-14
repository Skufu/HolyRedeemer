package handlers

import (
	"fmt"
	"log"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/holyredeemer/library-api/internal/config"
	"github.com/holyredeemer/library-api/internal/middleware"
	"github.com/holyredeemer/library-api/internal/repositories/sqlcdb"
	"github.com/holyredeemer/library-api/pkg/response"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
)

type CirculationHandler struct {
	queries *sqlcdb.Queries
	config  *config.Config
	db      *pgxpool.Pool
}

func NewCirculationHandler(queries *sqlcdb.Queries, cfg *config.Config, db *pgxpool.Pool) *CirculationHandler {
	return &CirculationHandler{
		queries: queries,
		config:  cfg,
		db:      db,
	}
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
	librarianUserID, _ := uuid.Parse(authUser.ID)
	librarian, err := h.queries.GetLibrarianByUserID(c.Request.Context(), toPgUUID(librarianUserID))
	librarianID := pgtype.UUID{Valid: false}
	if err == nil {
		librarianID = toPgUUID(librarian.ID)
	}

	// Validate student
	student, err := h.queries.GetStudentByID(c.Request.Context(), studentID)
	if err != nil {
		response.NotFound(c, "Student not found")
		return
	}

	if !isStudentStatusActive(student.Status) {
		response.BadRequest(c, "Student account is not active")
		return
	}

	// Check student's current loans
	currentLoans, _ := h.queries.GetStudentCurrentLoans(c.Request.Context(), toPgUUID(studentID))
	if currentLoans >= int64(h.config.DefaultMaxBooks) {
		response.BadRequest(c, "Student has reached maximum allowed loans")
		return
	}

	// Check student's fines
	totalFines, _ := h.queries.GetStudentTotalFines(c.Request.Context(), toPgUUID(studentID))
	if totalFines >= h.config.DefaultBlockThreshold {
		response.BadRequest(c, "Student is blocked due to unpaid fines")
		return
	}

	// Validate copy
	copy, err := h.queries.GetCopyByID(c.Request.Context(), copyID)
	if err != nil {
		response.NotFound(c, "Book copy not found")
		return
	}

	if !copy.Status.Valid || copy.Status.CopyStatus != sqlcdb.CopyStatusAvailable {
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

	// Begin transaction
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

	resp := CheckoutResponse{
		TransactionID: txn.ID.String(),
		CheckoutDate:  formatPgTimestamp(txn.CheckoutDate, time.RFC3339),
		DueDate:       formatPgDate(txn.DueDate, "2006-01-02"),
	}
	resp.Student.Name = student.UserName
	resp.Student.StudentID = student.StudentID
	resp.Book.Title = copy.BookTitle
	resp.Book.CopyNumber = copy.CopyNumber

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
	librarianUserID, _ := uuid.Parse(authUser.ID)
	librarian, err := h.queries.GetLibrarianByUserID(c.Request.Context(), toPgUUID(librarianUserID))
	librarianID := pgtype.UUID{Valid: false}
	if err == nil {
		librarianID = toPgUUID(librarian.ID)
	}

	// Find active loan for this copy
	loan, err := h.queries.GetActiveLoanByCopy(c.Request.Context(), toPgUUID(copyID))
	if err != nil {
		response.NotFound(c, "No active loan found for this copy")
		return
	}

	// Determine return condition
	returnCondition := sqlcdb.NullCopyCondition{CopyCondition: sqlcdb.CopyConditionGood, Valid: true}
	if req.Condition != "" {
		returnCondition = sqlcdb.NullCopyCondition{CopyCondition: sqlcdb.CopyCondition(req.Condition), Valid: true}
	}

	// Begin transaction
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

	// Update transaction
	now := time.Now()
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

			fine, err := queries.CreateFine(c.Request.Context(), sqlcdb.CreateFineParams{
				TransactionID: toPgUUID(loan.ID),
				StudentID:     loan.StudentID,
				Amount:        toPgNumeric(fineAmount),
				FineType:      sqlcdb.FineTypeOverdue,
				Description:   toPgText(""),
				Status:        sqlcdb.NullFineStatus{FineStatus: sqlcdb.FineStatusPending, Valid: true},
			})
			if err == nil {
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
				log.Printf("Failed to create fine: %v", err)
			}
		}
	}

	// Commit transaction
	if err := tx.Commit(c.Request.Context()); err != nil {
		log.Printf("Failed to commit transaction: %v", err)
		response.InternalError(c, "Failed to complete return")
		return
	}

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

	// Get transaction
	txn, err := h.queries.GetTransactionByID(c.Request.Context(), txnID)
	if err != nil {
		response.NotFound(c, "Transaction not found")
		return
	}

	// Check authorization
	authUser := middleware.GetAuthUser(c)
	if authUser.Role == "student" {
		student, _ := h.queries.GetStudentByUserID(c.Request.Context(), toPgUUID(uuid.MustParse(authUser.ID)))
		if student.ID != txn.ID {
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

	// Begin transaction
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
