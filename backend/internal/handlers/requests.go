package handlers

import (
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

type RequestHandler struct {
	queries *sqlcdb.Queries
	config  *config.Config
	db      *pgxpool.Pool
}

func NewRequestHandler(queries *sqlcdb.Queries, cfg *config.Config, db *pgxpool.Pool) *RequestHandler {
	return &RequestHandler{queries: queries, config: cfg, db: db}
}

// ListRequests returns paginated list of book requests
func (h *RequestHandler) ListRequests(c *gin.Context) {
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

	requests, err := h.queries.ListRequests(c.Request.Context(), sqlcdb.ListRequestsParams{
		Limit:     int32(perPage),
		Offset:    int32(offset),
		Status:    toPgRequestStatus(status),
		StudentID: studentID,
	})
	if err != nil {
		response.InternalError(c, "Failed to fetch requests")
		return
	}

	requestResponses := make([]gin.H, len(requests))
	for i, r := range requests {
		status := "pending"
		if r.Status.Valid {
			status = string(r.Status.RequestStatus)
		}

		requestResponses[i] = gin.H{
			"id":          r.ID.String(),
			"studentId":   r.StudentID.String(),
			"studentCode": r.StudentID_2,
			"studentName": r.StudentName,
			"bookId":      r.BookID.String(),
			"bookTitle":   r.BookTitle,
			"bookAuthor":  r.BookAuthor,
			"requestType": string(r.RequestType),
			"status":      status,
			"notes":       fromPgText(r.Notes),
			"requestDate": fromPgTimestamp(r.RequestDate).Format("2006-01-02T15:04:05Z07:00"),
			"processedAt": formatPgTimestamp(r.ProcessedAt, "2006-01-02T15:04:05Z07:00"),
		}
	}

	response.SuccessWithMeta(c, requestResponses, &response.Meta{
		Page:    page,
		PerPage: perPage,
		Total:   int64(len(requestResponses)),
	})
}

// CreateRequest creates a new book request
func (h *RequestHandler) CreateRequest(c *gin.Context) {
	authUser := middleware.GetAuthUser(c)
	if authUser == nil {
		response.Unauthorized(c, "User not authenticated")
		return
	}

	var input struct {
		BookID      string `json:"book_id" binding:"required"`
		RequestType string `json:"request_type" binding:"required,oneof=reservation request"`
		Notes       string `json:"notes"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		response.BadRequest(c, "Invalid request data")
		return
	}

	bookID, err := uuid.Parse(input.BookID)
	if err != nil {
		response.BadRequest(c, "Invalid book ID")
		return
	}

	userID, err := uuid.Parse(authUser.ID)
	if err != nil {
		response.BadRequest(c, "Invalid user ID")
		return
	}

	student, err := h.queries.GetStudentByUserID(c.Request.Context(), toPgUUID(userID))
	if err != nil {
		response.NotFound(c, "Student not found")
		return
	}

	request, err := h.queries.CreateRequest(c.Request.Context(), sqlcdb.CreateRequestParams{
		StudentID:   toPgUUID(student.ID),
		BookID:      toPgUUID(bookID),
		RequestType: sqlcdb.RequestType(input.RequestType),
		Notes:       toPgText(input.Notes),
	})
	if err != nil {
		response.InternalError(c, "Failed to create request")
		return
	}

	response.Success(c, gin.H{"id": request.ID.String()}, "Request created successfully")
}

// GetPendingCount returns count of pending requests
func (h *RequestHandler) GetPendingCount(c *gin.Context) {
	count, err := h.queries.CountPendingRequests(c.Request.Context())
	if err != nil {
		response.InternalError(c, "Failed to count pending requests")
		return
	}

	response.Success(c, gin.H{"count": count}, "Pending requests counted successfully")
}

// ApproveRequest approves a book request
func (h *RequestHandler) ApproveRequest(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		response.BadRequest(c, "Invalid request ID")
		return
	}

	authUser := middleware.GetAuthUser(c)
	if authUser == nil {
		response.Unauthorized(c, "User not authenticated")
		return
	}

	userID, err := uuid.Parse(authUser.ID)
	if err != nil {
		response.BadRequest(c, "Invalid user ID")
		return
	}

	librarian, err := h.queries.GetLibrarianByUserID(c.Request.Context(), toPgUUID(userID))
	if err != nil {
		response.Forbidden(c, "Only librarians can approve requests")
		return
	}

	request, err := h.queries.GetRequestByID(c.Request.Context(), id)
	if err != nil {
		response.NotFound(c, "Request not found")
		return
	}

	studentID := fromPgUUID(request.StudentID)
	bookID := fromPgUUID(request.BookID)

	requestStatus := "pending"
	if request.Status.Valid {
		requestStatus = string(request.Status.RequestStatus)
	}
	if requestStatus != "pending" {
		response.BadRequest(c, "Request has already been processed")
		return
	}

	if request.RequestType == sqlcdb.RequestTypeReservation {
		currentLoans, _ := h.queries.GetStudentCurrentLoans(c.Request.Context(), toPgUUID(studentID))
		if currentLoans >= int64(h.config.DefaultMaxBooks) {
			response.BadRequest(c, "Student has reached maximum allowed loans")
			return
		}

		totalFines, _ := h.queries.GetStudentTotalFines(c.Request.Context(), toPgUUID(studentID))
		if totalFines >= h.config.DefaultBlockThreshold {
			response.BadRequest(c, "Student is blocked due to unpaid fines")
			return
		}

		copy, err := h.queries.GetAvailableCopy(c.Request.Context(), toPgUUID(bookID))
		if err != nil {
			response.BadRequest(c, "No available copies to reserve")
			return
		}

		dueDate := time.Now().AddDate(0, 0, h.config.DefaultLoanDays)

		tx, err := h.db.Begin(c.Request.Context())
		if err != nil {
			response.InternalError(c, "Failed to begin transaction")
			return
		}
		defer func() {
			_ = tx.Rollback(c.Request.Context())
		}()

		queries := h.queries.WithTx(tx)

		_, err = queries.ApproveRequest(c.Request.Context(), sqlcdb.ApproveRequestParams{
			ID:          id,
			ProcessedBy: toPgUUID(librarian.ID),
		})
		if err != nil {
			response.InternalError(c, "Failed to approve request")
			return
		}

		_, err = queries.CreateTransaction(c.Request.Context(), sqlcdb.CreateTransactionParams{
			StudentID:      toPgUUID(studentID),
			CopyID:         toPgUUID(copy.ID),
			LibrarianID:    toPgUUID(librarian.ID),
			CheckoutDate:   toPgTimestamp(time.Now()),
			DueDate:        toPgDate(dueDate),
			Status:         sqlcdb.NullTransactionStatus{TransactionStatus: sqlcdb.TransactionStatusBorrowed, Valid: true},
			CheckoutMethod: sqlcdb.NullCheckoutMethod{CheckoutMethod: sqlcdb.CheckoutMethodCounter, Valid: true},
			Notes:          toPgText("Approved reservation"),
		})
		if err != nil {
			response.InternalError(c, "Failed to create transaction")
			return
		}

		err = queries.UpdateCopyStatus(c.Request.Context(), sqlcdb.UpdateCopyStatusParams{
			ID:     copy.ID,
			Status: sqlcdb.NullCopyStatus{CopyStatus: sqlcdb.CopyStatusBorrowed, Valid: true},
		})
		if err != nil {
			response.InternalError(c, "Failed to update copy status")
			return
		}

		if err := tx.Commit(c.Request.Context()); err != nil {
			response.InternalError(c, "Failed to approve reservation")
			return
		}

		response.Success(c, nil, "Reservation approved and checked out")
		return
	}

	_, err = h.queries.ApproveRequest(c.Request.Context(), sqlcdb.ApproveRequestParams{
		ID:          id,
		ProcessedBy: toPgUUID(librarian.ID),
	})
	if err != nil {
		response.InternalError(c, "Failed to approve request")
		return
	}

	response.Success(c, nil, "Request approved")
}

// RejectRequest rejects a book request
func (h *RequestHandler) RejectRequest(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		response.BadRequest(c, "Invalid request ID")
		return
	}

	var input struct {
		Notes string `json:"notes"`
	}
	c.ShouldBindJSON(&input)

	authUser := middleware.GetAuthUser(c)
	if authUser == nil {
		response.Unauthorized(c, "User not authenticated")
		return
	}

	userID, err := uuid.Parse(authUser.ID)
	if err != nil {
		response.BadRequest(c, "Invalid user ID")
		return
	}

	librarian, err := h.queries.GetLibrarianByUserID(c.Request.Context(), toPgUUID(userID))
	if err != nil {
		response.Forbidden(c, "Only librarians can reject requests")
		return
	}

	_, err = h.queries.RejectRequest(c.Request.Context(), sqlcdb.RejectRequestParams{
		ID:          id,
		Notes:       toPgText(input.Notes),
		ProcessedBy: toPgUUID(librarian.ID),
	})
	if err != nil {
		response.InternalError(c, "Failed to reject request")
		return
	}

	response.Success(c, nil, "Request rejected")
}
