package handlers

import (
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/holyredeemer/library-api/internal/repositories/sqlcdb"
	"github.com/holyredeemer/library-api/internal/utils"
	"github.com/holyredeemer/library-api/pkg/response"
	"github.com/jackc/pgx/v5/pgxpool"
)

type LibrarianHandler struct {
	queries *sqlcdb.Queries
	db      *pgxpool.Pool
}

func NewLibrarianHandler(queries *sqlcdb.Queries, db *pgxpool.Pool) *LibrarianHandler {
	return &LibrarianHandler{queries: queries, db: db}
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

type CreateLibrarianRequest struct {
	Username   string `json:"username" binding:"required"`
	Password   string `json:"password" binding:"required"`
	EmployeeID string `json:"employee_id" binding:"required"`
	Name       string `json:"name" binding:"required"`
	Email      string `json:"email"`
	Phone      string `json:"phone"`
	Department string `json:"department"`
}

type UpdateLibrarianRequest struct {
	EmployeeID string `json:"employee_id"`
	Name       string `json:"name"`
	Email      string `json:"email"`
	Phone      string `json:"phone"`
	Department string `json:"department"`
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

func (h *LibrarianHandler) GetLibrarian(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "Invalid librarian ID")
		return
	}

	librarian, err := h.queries.GetLibrarianByID(c.Request.Context(), id)
	if err != nil {
		response.NotFound(c, "Librarian not found")
		return
	}

	user, err := h.queries.GetUserByID(c.Request.Context(), fromPgUUID(librarian.UserID))
	if err != nil {
		response.NotFound(c, "User not found")
		return
	}

	response.Success(c, LibrarianResponse{
		ID:         librarian.ID.String(),
		UserID:     fromPgUUID(librarian.UserID).String(),
		Username:   user.Username,
		EmployeeID: librarian.EmployeeID,
		Name:       librarian.Name,
		Email:      fromPgText(librarian.Email),
		Phone:      fromPgText(librarian.Phone),
		Department: fromPgText(librarian.Department),
		CreatedAt:  fromPgTimestamp(librarian.CreatedAt).String(),
	}, "")
}

func (h *LibrarianHandler) CreateLibrarian(c *gin.Context) {
	var req CreateLibrarianRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request body")
		return
	}

	tx, err := h.db.Begin(c.Request.Context())
	if err != nil {
		response.InternalError(c, "Failed to begin transaction")
		return
	}
	defer tx.Rollback(c.Request.Context())

	queries := h.queries.WithTx(tx)

	// Hash password before storing
	passwordHash, err := utils.HashPassword(req.Password)
	if err != nil {
		response.InternalError(c, "Failed to hash password")
		return
	}

	user, err := queries.CreateUser(c.Request.Context(), sqlcdb.CreateUserParams{
		Username:     req.Username,
		PasswordHash: passwordHash,
		Role:         sqlcdb.UserRoleLibrarian,
		Name:         req.Name,
		Email:        toPgText(req.Email),
		Status:       sqlcdb.NullUserStatus{UserStatus: sqlcdb.UserStatusActive, Valid: true},
	})
	if err != nil {
		response.Conflict(c, "Username already exists")
		return
	}

	librarian, err := queries.CreateLibrarian(c.Request.Context(), sqlcdb.CreateLibrarianParams{
		UserID:     toPgUUID(user.ID),
		EmployeeID: req.EmployeeID,
		Name:       req.Name,
		Email:      toPgText(req.Email),
		Phone:      toPgText(req.Phone),
		Department: toPgText(req.Department),
	})
	if err != nil {
		response.InternalError(c, "Failed to create librarian")
		return
	}

	if err := tx.Commit(c.Request.Context()); err != nil {
		response.InternalError(c, "Failed to create librarian")
		return
	}

	LogAuditFromContext(c, h.queries, sqlcdb.AuditActionCreate, "user", user.ID, map[string]interface{}{
		"username":    user.Username,
		"employee_id": librarian.EmployeeID,
		"role":        user.Role,
	})

	response.Created(c, LibrarianResponse{
		ID:         librarian.ID.String(),
		UserID:     fromPgUUID(librarian.UserID).String(),
		Username:   user.Username,
		EmployeeID: librarian.EmployeeID,
		Name:       librarian.Name,
		Email:      fromPgText(librarian.Email),
		Phone:      fromPgText(librarian.Phone),
		Department: fromPgText(librarian.Department),
		CreatedAt:  fromPgTimestamp(librarian.CreatedAt).String(),
	}, "Librarian created successfully")
}

func (h *LibrarianHandler) UpdateLibrarian(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "Invalid librarian ID")
		return
	}

	var req UpdateLibrarianRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request body")
		return
	}

	librarian, err := h.queries.GetLibrarianByID(c.Request.Context(), id)
	if err != nil {
		response.NotFound(c, "Librarian not found")
		return
	}

	tx, err := h.db.Begin(c.Request.Context())
	if err != nil {
		response.InternalError(c, "Failed to begin transaction")
		return
	}
	defer tx.Rollback(c.Request.Context())

	queries := h.queries.WithTx(tx)

	if req.Name != "" || req.Email != "" {
		_, err = queries.UpdateUser(c.Request.Context(), sqlcdb.UpdateUserParams{
			ID:    fromPgUUID(librarian.UserID),
			Name:  toPgText(req.Name),
			Email: toPgText(req.Email),
		})
		if err != nil {
			response.InternalError(c, "Failed to update user profile")
			return
		}
	}

	if err := tx.Commit(c.Request.Context()); err != nil {
		response.InternalError(c, "Failed to update librarian")
		return
	}

	LogAuditFromContext(c, h.queries, sqlcdb.AuditActionUpdate, "user", fromPgUUID(librarian.UserID), map[string]interface{}{
		"name":       req.Name,
		"department": req.Department,
	})

	response.Success(c, nil, "Librarian updated successfully")
}

func (h *LibrarianHandler) DeleteLibrarian(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "Invalid librarian ID")
		return
	}

	librarian, err := h.queries.GetLibrarianByID(c.Request.Context(), id)
	if err != nil {
		response.NotFound(c, "Librarian not found")
		return
	}

	err = h.queries.DeleteUser(c.Request.Context(), fromPgUUID(librarian.UserID))
	if err != nil {
		response.InternalError(c, "Failed to delete librarian")
		return
	}

	LogAuditFromContext(c, h.queries, sqlcdb.AuditActionDelete, "user", fromPgUUID(librarian.UserID), nil)

	response.Success(c, nil, "Librarian deleted successfully")
}
