package handlers

import (
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/holyredeemer/library-api/internal/repositories/sqlcdb"
	"github.com/holyredeemer/library-api/pkg/response"
)

type LibrarianHandler struct {
	queries *sqlcdb.Queries
}

func NewLibrarianHandler(queries *sqlcdb.Queries) *LibrarianHandler {
	return &LibrarianHandler{queries: queries}
}

type LibrarianResponse struct {
	ID         string `json:"id"`
	UserID     string `json:"userId"`
	Username   string `json:"username"`
	EmployeeID string `json:"employeeId"`
	Name       string `json:"name"`
	Email      string `json:"email"`
	Phone      string `json:"phone"`
	Department string `json:"department"`
	CreatedAt  string `json:"createdAt"`
}

func (h *LibrarianHandler) ListLibrarians(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	perPage, _ := strconv.Atoi(c.DefaultQuery("per_page", "20"))
	if perPage > 100 {
		perPage = 100
	}
	offset := (page - 1) * perPage

	librarians, err := h.queries.ListLibrarians(c.Request.Context(), sqlcdb.ListLibrariansParams{
		Limit:  toPgInt4(int32(perPage)),
		Offset: toPgInt4(int32(offset)),
	})
	if err != nil {
		response.InternalError(c, "Failed to fetch librarians")
		return
	}

	responses := make([]LibrarianResponse, len(librarians))
	for i, l := range librarians {
		responses[i] = LibrarianResponse{
			ID:         l.ID.String(),
			UserID:     fromPgUUID(l.UserID).String(),
			Username:   fromPgText(l.Username),
			EmployeeID: l.EmployeeID,
			Name:       l.Name,
			Email:      fromPgText(l.Email),
			Phone:      fromPgText(l.Phone),
			Department: fromPgText(l.Department),
			CreatedAt:  fromPgTimestamp(l.CreatedAt).String(),
		}
	}

	response.Success(c, responses, "")
}
