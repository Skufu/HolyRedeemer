package handlers

import (
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/holyredeemer/library-api/internal/middleware"
	"github.com/holyredeemer/library-api/internal/repositories/sqlcdb"
	"github.com/holyredeemer/library-api/pkg/response"
	"github.com/jackc/pgx/v5/pgtype"
)

type RequestHandler struct {
	queries *sqlcdb.Queries
}

func NewRequestHandler(queries *sqlcdb.Queries) *RequestHandler {
	return &RequestHandler{queries: queries}
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
