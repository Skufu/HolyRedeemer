package handlers

import (
	"log"
	"strconv"

	"github.com/bytedance/sonic"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/holyredeemer/library-api/internal/middleware"
	"github.com/holyredeemer/library-api/internal/repositories/sqlcdb"
	"github.com/holyredeemer/library-api/pkg/response"
	"github.com/jackc/pgx/v5/pgtype"
)

type AuditHandler struct {
	queries *sqlcdb.Queries
}

func NewAuditHandler(queries *sqlcdb.Queries) *AuditHandler {
	return &AuditHandler{queries: queries}
}

type AuditLogResponse struct {
	ID         string  `json:"id"`
	UserID     *string `json:"userId"`
	Action     string  `json:"action"`
	EntityType string  `json:"entityType"`
	EntityID   *string `json:"entityId"`
	OldValues  []byte  `json:"oldValues"`
	NewValues  []byte  `json:"newValues"`
	IPAddress  string  `json:"ipAddress"`
	UserAgent  string  `json:"userAgent"`
	CreatedAt  string  `json:"createdAt"`
}

func (h *AuditHandler) ListAuditLogs(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	perPage, _ := strconv.Atoi(c.DefaultQuery("per_page", "20"))
	if perPage > 100 {
		perPage = 100
	}
	offset := (page - 1) * perPage

	userIDStr := c.Query("user_id")
	action := c.Query("action")
	entityType := c.Query("entity_type")

	params := sqlcdb.ListAuditLogsParams{
		Limit:      pgtype.Int4{Int32: int32(perPage), Valid: true},
		Offset:     pgtype.Int4{Int32: int32(offset), Valid: true},
		FromDate:   pgtype.Timestamp{Valid: false},
		ToDate:     pgtype.Timestamp{Valid: false},
		UserID:     pgtype.UUID{Valid: false},
		Action:     pgtype.Text{Valid: false},
		EntityType: pgtype.Text{Valid: false},
	}

	if userIDStr != "" {
		if uid, err := uuid.Parse(userIDStr); err == nil {
			params.UserID = pgtype.UUID{Bytes: uid, Valid: true}
		}
	}

	if action != "" {
		params.Action = pgtype.Text{String: action, Valid: true}
	}

	if entityType != "" {
		params.EntityType = pgtype.Text{String: entityType, Valid: true}
	}

	logs, err := h.queries.ListAuditLogs(c.Request.Context(), params)
	if err != nil {
		log.Printf("ListAuditLogs error: %v", err)
		response.InternalError(c, "Failed to fetch audit logs")
		return
	}

	auditResponses := make([]AuditLogResponse, len(logs))
	for i, log := range logs {
		var userID *string
		if log.UserID.Valid {
			uid := fromPgUUID(log.UserID).String()
			userID = &uid
		}

		var entityID *string
		if log.EntityID.Valid {
			eid := fromPgUUID(log.EntityID).String()
			entityID = &eid
		}

		auditResponses[i] = AuditLogResponse{
			ID:         log.ID.String(),
			UserID:     userID,
			Action:     log.Action,
			EntityType: fromPgText(log.EntityType),
			EntityID:   entityID,
			OldValues:  log.OldValues,
			NewValues:  log.NewValues,
			IPAddress:  fromPgText(log.IpAddress),
			UserAgent:  fromPgText(log.UserAgent),
			CreatedAt:  fromPgTimestamp(log.CreatedAt).String(),
		}
	}

	response.Success(c, auditResponses, "")
}

// LogAudit creates an audit log entry
func (h *AuditHandler) LogAudit(c *gin.Context, action sqlcdb.AuditAction, entityType string, entityID uuid.UUID, oldValues, newValues []byte) error {
	userID := pgtype.UUID{Valid: false}
	if authUser := middleware.GetAuthUser(c); authUser != nil {
		if uid, err := uuid.Parse(authUser.ID); err == nil {
			userID = pgtype.UUID{Bytes: uid, Valid: true}
		}
	}

	_, err := h.queries.CreateAuditLog(c.Request.Context(), sqlcdb.CreateAuditLogParams{
		UserID:     userID,
		Action:     action,
		EntityType: pgtype.Text{String: entityType, Valid: true},
		EntityID:   pgtype.UUID{Bytes: entityID, Valid: true},
		OldValues:  oldValues,
		NewValues:  newValues,
		IpAddress:  pgtype.Text{String: c.ClientIP(), Valid: true},
		UserAgent:  pgtype.Text{String: c.Request.UserAgent(), Valid: true},
	})
	return err
}

// LogAuditFromContext is a standalone function to log audit entries from any handler
func LogAuditFromContext(c *gin.Context, queries *sqlcdb.Queries, action sqlcdb.AuditAction, entityType string, entityID uuid.UUID, newValues map[string]interface{}) {
	userID := pgtype.UUID{Valid: false}
	if authUser := middleware.GetAuthUser(c); authUser != nil {
		if uid, err := uuid.Parse(authUser.ID); err == nil {
			userID = pgtype.UUID{Bytes: uid, Valid: true}
		}
	}

	var newValuesJSON []byte
	if newValues != nil {
		newValuesJSON, _ = sonic.Marshal(newValues)
	}

	_, _ = queries.CreateAuditLog(c.Request.Context(), sqlcdb.CreateAuditLogParams{
		UserID:     userID,
		Action:     action,
		EntityType: pgtype.Text{String: entityType, Valid: true},
		EntityID:   pgtype.UUID{Bytes: entityID, Valid: true},
		OldValues:  nil,
		NewValues:  newValuesJSON,
		IpAddress:  pgtype.Text{String: c.ClientIP(), Valid: true},
		UserAgent:  pgtype.Text{String: c.Request.UserAgent(), Valid: true},
	})
}
