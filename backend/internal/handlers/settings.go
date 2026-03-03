package handlers

import (
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/holyredeemer/library-api/internal/middleware"
	"github.com/holyredeemer/library-api/internal/repositories/sqlcdb"
	"github.com/holyredeemer/library-api/pkg/response"
	"github.com/jackc/pgx/v5/pgtype"
)

type SettingsHandler struct {
	queries *sqlcdb.Queries
}

func NewSettingsHandler(queries *sqlcdb.Queries) *SettingsHandler {
	return &SettingsHandler{queries: queries}
}

type LibrarySetting struct {
	Key         string `json:"key"`
	Value       string `json:"value"`
	Description string `json:"description,omitempty"`
	Category    string `json:"category,omitempty"`
}

type UpdateSettingsInput struct {
	Settings map[string]string `json:"settings" binding:"required"`
}

func (h *SettingsHandler) ListSettings(c *gin.Context) {
	category := c.Query("category")

	var categoryParam pgtype.Text
	if category != "" {
		categoryParam = pgtype.Text{String: category, Valid: true}
	}

	settings, err := h.queries.ListSettings(c.Request.Context(), categoryParam)
	if err != nil {
		response.InternalError(c, "Failed to fetch settings")
		return
	}

	result := make([]LibrarySetting, len(settings))
	for i, s := range settings {
		result[i] = LibrarySetting{
			Key:         s.Key,
			Value:       s.Value,
			Description: s.Description,
			Category:    s.Category,
		}
	}

	response.Success(c, result, "")
}

func (h *SettingsHandler) GetSetting(c *gin.Context) {
	key := c.Param("key")
	keyParam := pgtype.Text{String: key, Valid: true}

	setting, err := h.queries.GetSetting(c.Request.Context(), keyParam)
	if err != nil {
		response.NotFound(c, "Setting not found")
		return
	}

	result := LibrarySetting{
		Key:         setting.Key,
		Value:       setting.Value,
		Description: setting.Description,
		Category:    setting.Category,
	}

	response.Success(c, result, "")
}

func (h *SettingsHandler) UpdateSettings(c *gin.Context) {
	var input UpdateSettingsInput
	if err := c.ShouldBindJSON(&input); err != nil {
		response.BadRequest(c, "Invalid request body")
		return
	}

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

	for key, value := range input.Settings {
		err := h.queries.UpdateSetting(c.Request.Context(), sqlcdb.UpdateSettingParams{
			Key:       toPgText(key),
			Value:     toPgText(value),
			UpdatedBy: toPgUUID(userID),
		})
		if err != nil {
			response.InternalError(c, "Failed to update settings")
			return
		}
	}

	response.Success(c, nil, "Settings updated successfully")
}

func (h *SettingsHandler) GetBorrowingSettings(c *gin.Context) {
	categoryParam := pgtype.Text{String: "borrowing", Valid: true}

	settings, err := h.queries.ListSettings(c.Request.Context(), categoryParam)
	if err != nil {
		response.InternalError(c, "Failed to fetch borrowing settings")
		return
	}

	result := make(map[string]string)
	for _, s := range settings {
		result[s.Key] = s.Value
	}

	response.Success(c, result, "")
}

func (h *SettingsHandler) GetFineSettings(c *gin.Context) {
	categoryParam := pgtype.Text{String: "fines", Valid: true}

	settings, err := h.queries.ListSettings(c.Request.Context(), categoryParam)
	if err != nil {
		response.InternalError(c, "Failed to fetch fine settings")
		return
	}

	result := make(map[string]string)
	for _, s := range settings {
		result[s.Key] = s.Value
	}

	response.Success(c, result, "")
}
