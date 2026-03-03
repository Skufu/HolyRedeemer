package handlers

import (
	"crypto/sha256"
	"encoding/hex"
	"log"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/holyredeemer/library-api/internal/middleware"
	"github.com/holyredeemer/library-api/internal/repositories/sqlcdb"
	"github.com/holyredeemer/library-api/internal/utils"
	"github.com/holyredeemer/library-api/pkg/response"
	"golang.org/x/sync/errgroup"
)

type AuthHandler struct {
	queries    *sqlcdb.Queries
	jwtManager *utils.JWTManager
}

func NewAuthHandler(queries *sqlcdb.Queries, jwtManager *utils.JWTManager) *AuthHandler {
	return &AuthHandler{
		queries:    queries,
		jwtManager: jwtManager,
	}
}

// LoginRequest represents the login request body
type LoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

// LoginResponse represents the login response
type LoginResponse struct {
	AccessToken  string       `json:"access_token"`
	RefreshToken string       `json:"refresh_token"`
	ExpiresIn    int64        `json:"expires_in"`
	User         UserResponse `json:"user"`
}

// UserResponse represents user data in responses
type UserResponse struct {
	ID        string    `json:"id"`
	Username  string    `json:"username"`
	Name      string    `json:"name"`
	Email     string    `json:"email,omitempty"`
	Role      string    `json:"role"`
	CreatedAt time.Time `json:"createdAt"`
}

// Login handles user authentication
func (h *AuthHandler) Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request body")
		return
	}

	// Get user by username
	user, err := h.queries.GetUserByUsername(c.Request.Context(), req.Username)
	if err != nil {
		response.Unauthorized(c, "Invalid credentials")
		return
	}

	// Check password
	if !utils.CheckPassword(req.Password, user.PasswordHash) {
		response.Unauthorized(c, "Invalid credentials")
		return
	}

	// Check user status
	if !isUserActive(user.Status) {
		response.Forbidden(c, "Account is not active")
		return
	}

	// Generate tokens
	accessToken, refreshToken, err := h.jwtManager.GenerateTokenPair(
		user.ID,
		user.Username,
		string(user.Role),
	)
	if err != nil {
		response.InternalError(c, "Failed to generate tokens")
		return
	}

	// Store refresh token hash
	tokenHash := hashToken(refreshToken)
	_, err = h.queries.CreateRefreshToken(c.Request.Context(), sqlcdb.CreateRefreshTokenParams{
		UserID:    toPgUUID(user.ID),
		TokenHash: tokenHash,
		ExpiresAt: toPgTimestamp(time.Now().Add(7 * 24 * time.Hour)),
	})
	if err != nil {
		response.InternalError(c, "Failed to store refresh token")
		return
	}

	// Build response
	response.Success(c, LoginResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		ExpiresIn:    h.jwtManager.GetAccessExpiry(),
		User: UserResponse{
			ID:        user.ID.String(),
			Username:  user.Username,
			Name:      user.Name,
			Email:     fromPgText(user.Email),
			Role:      string(user.Role),
			CreatedAt: fromPgTimestamp(user.CreatedAt),
		},
	}, "Login successful")
}

// RefreshTokenRequest represents the refresh token request
type RefreshTokenRequest struct {
	RefreshToken string `json:"refresh_token" binding:"required"`
}

// RefreshToken handles token refresh
func (h *AuthHandler) RefreshToken(c *gin.Context) {
	var req RefreshTokenRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request body")
		return
	}

	// Validate refresh token
	claims, err := h.jwtManager.ValidateRefreshToken(req.RefreshToken)
	if err != nil {
		response.Unauthorized(c, "Invalid or expired refresh token")
		return
	}

	// Check if token exists in database
	tokenHash := hashToken(req.RefreshToken)
	_, err = h.queries.GetRefreshToken(c.Request.Context(), tokenHash)
	if err != nil {
		response.Unauthorized(c, "Refresh token not found or expired")
		return
	}

	// Get user to ensure they still exist and are active
	user, err := h.queries.GetUserByID(c.Request.Context(), claims.UserID)
	if err != nil {
		response.Unauthorized(c, "User not found")
		return
	}

	if !isUserActive(user.Status) {
		response.Forbidden(c, "Account is not active")
		return
	}

	// Generate new access token
	accessToken, err := h.jwtManager.GenerateAccessToken(
		user.ID,
		user.Username,
		string(user.Role),
	)
	if err != nil {
		response.InternalError(c, "Failed to generate access token")
		return
	}

	response.Success(c, gin.H{
		"access_token": accessToken,
		"expires_in":   h.jwtManager.GetAccessExpiry(),
	}, "Token refreshed")
}

// Logout handles user logout
func (h *AuthHandler) Logout(c *gin.Context) {
	// Get refresh token from request if provided
	var req RefreshTokenRequest
	if err := c.ShouldBindJSON(&req); err == nil && req.RefreshToken != "" {
		tokenHash := hashToken(req.RefreshToken)
		if err := h.queries.DeleteRefreshToken(c.Request.Context(), tokenHash); err != nil {
			log.Printf("Warning: Failed to delete refresh token: %v", err)
		}
	}

	response.Success(c, nil, "Logged out successfully")
}

// RFIDLookupRequest represents the RFID lookup request
type RFIDLookupRequest struct {
	RFIDCode string `json:"rfid_code" binding:"required"`
}

// StudentLookupResponse represents student lookup data
type StudentLookupResponse struct {
	ID           string  `json:"id"`
	StudentID    string  `json:"student_id"`
	Name         string  `json:"name"`
	GradeLevel   int32   `json:"grade_level"`
	Section      string  `json:"section"`
	CurrentLoans int64   `json:"current_loans"`
	HasOverdue   bool    `json:"has_overdue"`
	TotalFines   float64 `json:"total_fines"`
	Status       string  `json:"status"`
}

// RFIDLookup handles RFID-based student lookup
func (h *AuthHandler) RFIDLookup(c *gin.Context) {
	var req RFIDLookupRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request body")
		return
	}

	student, err := h.queries.GetStudentByRFID(c.Request.Context(), toPgText(req.RFIDCode))
	if err != nil {
		response.NotFound(c, "No student found with this RFID")
		return
	}

	// Get current loans, fines, and overdue count concurrently
	var loans int64
	var fines float64
	var studentOverdueCount int64

	g, ctx := errgroup.WithContext(c.Request.Context())

	g.Go(func() error {
		var err error
		loans, err = h.queries.GetStudentCurrentLoans(ctx, toPgUUID(student.ID))
		return err
	})

	g.Go(func() error {
		var err error
		fines, err = h.queries.GetStudentTotalFines(ctx, toPgUUID(student.ID))
		return err
	})

	g.Go(func() error {
		var err error
		studentOverdueCount, err = h.queries.CountStudentOverdueLoans(ctx, toPgUUID(student.ID))
		return err
	})

	if err := g.Wait(); err != nil {
		response.InternalError(c, "Failed to fetch student status")
		return
	}

	hasOverdue := studentOverdueCount > 0

	response.Success(c, gin.H{
		"student": StudentLookupResponse{
			ID:           student.ID.String(),
			StudentID:    student.StudentID,
			Name:         student.UserName,
			GradeLevel:   student.GradeLevel,
			Section:      student.Section,
			CurrentLoans: loans,
			HasOverdue:   hasOverdue,
			TotalFines:   fines,
			Status:       getStudentStatusFromNull(student.Status),
		},
	}, "Student found")
}

// RegisterRFIDRequest represents the RFID registration request
type RegisterRFIDRequest struct {
	RFIDCode string `json:"rfid_code" binding:"required"`
}

// RegisterRFID allows a student to register their RFID card
func (h *AuthHandler) RegisterRFID(c *gin.Context) {
	authUser := middleware.GetAuthUser(c)
	if authUser == nil || authUser.Role != "student" {
		response.Forbidden(c, "Only students can register RFID cards")
		return
	}

	var req RegisterRFIDRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request body")
		return
	}

	userID, err := uuid.Parse(authUser.ID)
	if err != nil {
		response.InternalError(c, "Invalid user ID")
		return
	}

	// Check if RFID is already assigned to another student
	existingStudent, err := h.queries.GetStudentByRFID(c.Request.Context(), toPgText(req.RFIDCode))
	if err == nil && existingStudent.ID != uuid.Nil {
		response.Conflict(c, "RFID already assigned to another student")
		return
	}

	// Check if user already has an RFID registered
	currentStudent, err := h.queries.GetStudentByUserID(c.Request.Context(), toPgUUID(userID))
	if err != nil {
		response.NotFound(c, "Student record not found")
		return
	}
	if currentStudent.RfidCode.Valid && currentStudent.RfidCode.String != "" {
		response.Conflict(c, "You already have an RFID registered")
		return
	}

	err = h.queries.RegisterStudentRFID(c.Request.Context(), sqlcdb.RegisterStudentRFIDParams{
		UserID:   toPgUUID(userID),
		RfidCode: toPgText(req.RFIDCode),
	})
	if err != nil {
		response.InternalError(c, "Failed to register RFID")
		return
	}

	response.Success(c, nil, "RFID registered successfully")
}

// Helper functions
func hashToken(token string) string {
	hash := sha256.Sum256([]byte(token))
	return hex.EncodeToString(hash[:])
}
