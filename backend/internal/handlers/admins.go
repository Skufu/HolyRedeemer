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

type AdminHandler struct {
	queries *sqlcdb.Queries
	db      *pgxpool.Pool
}

func NewAdminHandler(queries *sqlcdb.Queries, db *pgxpool.Pool) *AdminHandler {
	return &AdminHandler{queries: queries, db: db}
}

type AdminResponse struct {
	ID        string `json:"id"`
	Username  string `json:"username"`
	Name      string `json:"name"`
	Email     string `json:"email"`
	Role      string `json:"role"`
	Status    string `json:"status"`
	CreatedAt string `json:"createdAt"`
}

type CreateAdminRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
	Name     string `json:"name" binding:"required"`
	Email    string `json:"email"`
	Role     string `json:"role"` // "admin" or "super_admin", defaults to "admin"
}

type UpdateAdminRequest struct {
	Name   string `json:"name"`
	Email  string `json:"email"`
	Status string `json:"status"`
}

func (h *AdminHandler) ListAdmins(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	perPage, _ := strconv.Atoi(c.DefaultQuery("per_page", "20"))
	if perPage > 100 {
		perPage = 100
	}
	offset := (page - 1) * perPage

	admins, err := h.queries.ListAdmins(c.Request.Context(), sqlcdb.ListAdminsParams{
		Limit:  int32(perPage),
		Offset: int32(offset),
	})
	if err != nil {
		response.InternalError(c, "Failed to fetch admins")
		return
	}

	total, _ := h.queries.CountAdmins(c.Request.Context())

	responses := make([]AdminResponse, len(admins))
	for i, a := range admins {
		responses[i] = AdminResponse{
			ID:        a.ID.String(),
			Username:  a.Username,
			Name:      a.Name,
			Email:     fromPgText(a.Email),
			Role:      string(a.Role),
			Status:    getUserStatus(a.Status),
			CreatedAt: fromPgTimestamp(a.CreatedAt).String(),
		}
	}

	totalPages := int(total) / perPage
	if int(total)%perPage > 0 {
		totalPages++
	}

	response.SuccessWithMeta(c, responses, &response.Meta{
		Page:       page,
		PerPage:    perPage,
		Total:      total,
		TotalPages: totalPages,
	})
}

func (h *AdminHandler) GetAdmin(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "Invalid admin ID")
		return
	}

	admin, err := h.queries.GetAdminByID(c.Request.Context(), id)
	if err != nil {
		response.NotFound(c, "Admin not found")
		return
	}

	response.Success(c, AdminResponse{
		ID:        admin.ID.String(),
		Username:  admin.Username,
		Name:      admin.Name,
		Email:     fromPgText(admin.Email),
		Role:      string(admin.Role),
		Status:    getUserStatus(admin.Status),
		CreatedAt: fromPgTimestamp(admin.CreatedAt).String(),
	}, "")
}

func (h *AdminHandler) CreateAdmin(c *gin.Context) {
	var req CreateAdminRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request body")
		return
	}

	// Default role to admin if not specified or invalid
	role := sqlcdb.UserRoleAdmin
	if req.Role == "super_admin" {
		role = sqlcdb.UserRoleSuperAdmin
	}

	// Hash password
	passwordHash, err := utils.HashPassword(req.Password)
	if err != nil {
		response.InternalError(c, "Failed to hash password")
		return
	}

	admin, err := h.queries.CreateAdmin(c.Request.Context(), sqlcdb.CreateAdminParams{
		Username:     req.Username,
		PasswordHash: passwordHash,
		Role:         role,
		Name:         req.Name,
		Email:        toPgText(req.Email),
		Status:       sqlcdb.NullUserStatus{UserStatus: sqlcdb.UserStatusActive, Valid: true},
	})
	if err != nil {
		response.Conflict(c, "Username already exists")
		return
	}

	LogAuditFromContext(c, h.queries, sqlcdb.AuditActionCreate, "user", admin.ID, map[string]interface{}{
		"username": admin.Username,
		"role":     admin.Role,
	})

	response.Created(c, AdminResponse{
		ID:        admin.ID.String(),
		Username:  admin.Username,
		Name:      admin.Name,
		Email:     fromPgText(admin.Email),
		Role:      string(admin.Role),
		Status:    getUserStatus(admin.Status),
		CreatedAt: fromPgTimestamp(admin.CreatedAt).String(),
	}, "Admin created successfully")
}

func (h *AdminHandler) UpdateAdmin(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "Invalid admin ID")
		return
	}

	var req UpdateAdminRequest
	if bindErr := c.ShouldBindJSON(&req); bindErr != nil {
		response.BadRequest(c, "Invalid request body")
		return
	}

	// Verify admin exists
	_, err = h.queries.GetAdminByID(c.Request.Context(), id)
	if err != nil {
		response.NotFound(c, "Admin not found")
		return
	}

	_, err = h.queries.UpdateAdmin(c.Request.Context(), sqlcdb.UpdateAdminParams{
		ID:     id,
		Name:   toPgText(req.Name),
		Email:  toPgText(req.Email),
		Status: toPgUserStatus(req.Status),
	})
	if err != nil {
		response.InternalError(c, "Failed to update admin")
		return
	}

	LogAuditFromContext(c, h.queries, sqlcdb.AuditActionUpdate, "user", id, map[string]interface{}{
		"name":   req.Name,
		"status": req.Status,
	})

	response.Success(c, nil, "Admin updated successfully")
}

func (h *AdminHandler) DeleteAdmin(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "Invalid admin ID")
		return
	}

	// Verify admin exists
	_, err = h.queries.GetAdminByID(c.Request.Context(), id)
	if err != nil {
		response.NotFound(c, "Admin not found")
		return
	}

	err = h.queries.DeleteAdmin(c.Request.Context(), id)
	if err != nil {
		response.InternalError(c, "Failed to delete admin")
		return
	}

	LogAuditFromContext(c, h.queries, sqlcdb.AuditActionDelete, "user", id, nil)

	response.Success(c, nil, "Admin deleted successfully")
}
