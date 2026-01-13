package handlers

import (
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/holyredeemer/library-api/internal/middleware"
	"github.com/holyredeemer/library-api/internal/repositories/sqlcdb"
	"github.com/holyredeemer/library-api/pkg/response"
	"github.com/jackc/pgx/v5/pgtype"
)

type NotificationHandler struct {
	queries *sqlcdb.Queries
}

func NewNotificationHandler(queries *sqlcdb.Queries) *NotificationHandler {
	return &NotificationHandler{queries: queries}
}

type NotificationResponse struct {
	ID            string    `json:"id"`
	Type          string    `json:"type"`
	Title         string    `json:"title"`
	Message       string    `json:"message"`
	IsRead        bool      `json:"isRead"`
	ReferenceType string    `json:"referenceType,omitempty"`
	ReferenceID   string    `json:"referenceId,omitempty"`
	CreatedAt     time.Time `json:"createdAt"`
}

func (h *NotificationHandler) ListNotifications(c *gin.Context) {
	authUser := middleware.GetAuthUser(c)
	if authUser == nil {
		response.Unauthorized(c, "User not authenticated")
		return
	}

	userID, err := uuid.Parse(authUser.ID)
	if err != nil {
		response.InternalError(c, "Invalid user ID")
		return
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	perPage, _ := strconv.Atoi(c.DefaultQuery("per_page", "20"))
	if perPage > 100 {
		perPage = 100
	}
	offset := (page - 1) * perPage

	var isRead pgtype.Bool
	switch c.Query("is_read") {
	case "true":
		isRead = pgtype.Bool{Bool: true, Valid: true}
	case "false":
		isRead = pgtype.Bool{Bool: false, Valid: true}
	}

	notifications, err := h.queries.ListUserNotifications(c.Request.Context(), sqlcdb.ListUserNotificationsParams{
		UserID: toPgUUID(userID),
		Limit:  int32(perPage),
		Offset: int32(offset),
		IsRead: isRead,
	})
	if err != nil {
		response.InternalError(c, "Failed to fetch notifications")
		return
	}

	total, _ := h.queries.CountUserNotifications(c.Request.Context(), sqlcdb.CountUserNotificationsParams{
		UserID: toPgUUID(userID),
		IsRead: isRead,
	})

	results := make([]NotificationResponse, len(notifications))
	for i, n := range notifications {
		results[i] = NotificationResponse{
			ID:            n.ID.String(),
			Type:          string(n.Type),
			Title:         n.Title,
			Message:       n.Message,
			IsRead:        n.IsRead.Bool,
			ReferenceType: fromPgText(n.ReferenceType),
			CreatedAt:     fromPgTimestamp(n.CreatedAt),
		}
		if n.ReferenceID.Valid {
			results[i].ReferenceID = uuid.UUID(n.ReferenceID.Bytes).String()
		}
	}

	totalPages := int(total) / perPage
	if int(total)%perPage > 0 {
		totalPages++
	}

	response.SuccessWithMeta(c, results, &response.Meta{
		Page:       page,
		PerPage:    perPage,
		Total:      total,
		TotalPages: totalPages,
	})
}

func (h *NotificationHandler) GetUnreadCount(c *gin.Context) {
	authUser := middleware.GetAuthUser(c)
	if authUser == nil {
		response.Unauthorized(c, "User not authenticated")
		return
	}

	userID, err := uuid.Parse(authUser.ID)
	if err != nil {
		response.InternalError(c, "Invalid user ID")
		return
	}

	count, err := h.queries.GetUnreadCount(c.Request.Context(), toPgUUID(userID))
	if err != nil {
		response.InternalError(c, "Failed to get unread count")
		return
	}

	response.Success(c, gin.H{"count": count}, "")
}

func (h *NotificationHandler) MarkAsRead(c *gin.Context) {
	notificationID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "Invalid notification ID")
		return
	}

	_, err = h.queries.MarkNotificationRead(c.Request.Context(), notificationID)
	if err != nil {
		response.InternalError(c, "Failed to mark notification as read")
		return
	}

	response.Success(c, nil, "Notification marked as read")
}

func (h *NotificationHandler) MarkAllAsRead(c *gin.Context) {
	authUser := middleware.GetAuthUser(c)
	if authUser == nil {
		response.Unauthorized(c, "User not authenticated")
		return
	}

	userID, err := uuid.Parse(authUser.ID)
	if err != nil {
		response.InternalError(c, "Invalid user ID")
		return
	}

	err = h.queries.MarkAllNotificationsRead(c.Request.Context(), toPgUUID(userID))
	if err != nil {
		response.InternalError(c, "Failed to mark notifications as read")
		return
	}

	response.Success(c, nil, "All notifications marked as read")
}
