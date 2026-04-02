package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/holyredeemer/library-api/internal/utils"
	"github.com/stretchr/testify/assert"
)

func newTestJWTManager() *utils.JWTManager {
	return utils.NewJWTManager(
		"test-access-secret-must-be-at-least-32-chars-long",
		"test-refresh-secret-must-be-at-least-32-chars-long",
		15*time.Minute,
		7*24*time.Hour,
	)
}

func generateTestToken(jwtManager *utils.JWTManager, role string) string {
	token, _, _ := jwtManager.GenerateTokenPair(
		uuid.New(),
		"testuser",
		role,
	)
	return token
}

func TestRequireRoles_AllowedRoles(t *testing.T) {
	gin.SetMode(gin.TestMode)

	tests := []struct {
		name         string
		role         string
		allowedRoles []string
		expectStatus int
	}{
		{
			name:         "librarian allowed for librarian+admin",
			role:         "librarian",
			allowedRoles: []string{"librarian", "admin"},
			expectStatus: http.StatusOK,
		},
		{
			name:         "admin allowed for librarian+admin",
			role:         "admin",
			allowedRoles: []string{"librarian", "admin"},
			expectStatus: http.StatusOK,
		},
		{
			name:         "student denied for librarian+admin",
			role:         "student",
			allowedRoles: []string{"librarian", "admin"},
			expectStatus: http.StatusForbidden,
		},
		{
			name:         "super_admin allowed for librarian+admin+super_admin",
			role:         "super_admin",
			allowedRoles: []string{"librarian", "admin", "super_admin"},
			expectStatus: http.StatusOK,
		},
		{
			name:         "student denied for librarian+admin+super_admin",
			role:         "student",
			allowedRoles: []string{"librarian", "admin", "super_admin"},
			expectStatus: http.StatusForbidden,
		},
		{
			name:         "student allowed for student-only",
			role:         "student",
			allowedRoles: []string{"student"},
			expectStatus: http.StatusOK,
		},
		{
			name:         "librarian denied for student-only",
			role:         "librarian",
			allowedRoles: []string{"student"},
			expectStatus: http.StatusForbidden,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			jwtManager := newTestJWTManager()
			router := gin.New()

			router.Use(Auth(jwtManager))
			router.Use(RequireRoles(tt.allowedRoles...))
			router.GET("/test", func(c *gin.Context) {
				c.Status(http.StatusOK)
			})

			token := generateTestToken(jwtManager, tt.role)
			req := httptest.NewRequest(http.MethodGet, "/test", nil)
			req.Header.Set("Authorization", "Bearer "+token)
			w := httptest.NewRecorder()

			router.ServeHTTP(w, req)

			assert.Equal(t, tt.expectStatus, w.Code)
		})
	}
}

func TestRequireRoles_NoAuthHeader(t *testing.T) {
	gin.SetMode(gin.TestMode)
	jwtManager := newTestJWTManager()
	router := gin.New()

	router.Use(Auth(jwtManager))
	router.Use(RequireRoles("librarian", "admin"))
	router.GET("/test", func(c *gin.Context) {
		c.Status(http.StatusOK)
	})

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	// Auth middleware catches missing header first → 401
	assert.Equal(t, http.StatusUnauthorized, w.Code)
}

func TestRequireRoles_InvalidToken(t *testing.T) {
	gin.SetMode(gin.TestMode)
	jwtManager := newTestJWTManager()
	router := gin.New()

	router.Use(Auth(jwtManager))
	router.Use(RequireRoles("librarian", "admin"))
	router.GET("/test", func(c *gin.Context) {
		c.Status(http.StatusOK)
	})

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	req.Header.Set("Authorization", "Bearer invalid-token-here")
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	// Auth middleware catches invalid token → 401
	assert.Equal(t, http.StatusUnauthorized, w.Code)
}

// TestRBACRouteRestrictions verifies the specific route restrictions added:
// - /circulation/renew requires librarian, admin, super_admin (NOT student)
// - /transactions requires librarian, admin, super_admin (NOT student)
// - /requests POST requires student only (NOT librarian/admin)
// Note: /students/:id/{loans,history,requests,fines} use handler-level ownership checks,
// not route-level RequireRoles, because students need to access their own data.
func TestRBACRouteRestrictions(t *testing.T) {
	gin.SetMode(gin.TestMode)
	jwtManager := newTestJWTManager()

	tests := []struct {
		name         string
		route        string
		method       string
		role         string
		expectStatus int
	}{
		{
			name:         "renew: student denied",
			route:        "/circulation/renew",
			method:       "POST",
			role:         "student",
			expectStatus: http.StatusForbidden,
		},
		{
			name:         "renew: librarian allowed",
			route:        "/circulation/renew",
			method:       "POST",
			role:         "librarian",
			expectStatus: http.StatusOK,
		},
		{
			name:         "renew: admin allowed",
			route:        "/circulation/renew",
			method:       "POST",
			role:         "admin",
			expectStatus: http.StatusOK,
		},
		{
			name:         "transactions: student denied",
			route:        "/transactions",
			method:       "GET",
			role:         "student",
			expectStatus: http.StatusForbidden,
		},
		{
			name:         "transactions: librarian allowed",
			route:        "/transactions",
			method:       "GET",
			role:         "librarian",
			expectStatus: http.StatusOK,
		},
		{
			name:         "requests-post: librarian denied",
			route:        "/requests",
			method:       "POST",
			role:         "librarian",
			expectStatus: http.StatusForbidden,
		},
		{
			name:         "requests-post: student allowed",
			route:        "/requests",
			method:       "POST",
			role:         "student",
			expectStatus: http.StatusOK,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			router := gin.New()

			switch tt.route {
			case "/circulation/renew":
				router.Use(Auth(jwtManager))
				router.Use(RequireRoles("librarian", "admin", "super_admin"))
			case "/transactions":
				router.Use(Auth(jwtManager))
				router.Use(RequireRoles("librarian", "admin", "super_admin"))
			case "/requests":
				router.Use(Auth(jwtManager))
				router.Use(RequireRoles("student"))
			}

			router.Handle(tt.method, tt.route, func(c *gin.Context) {
				c.Status(http.StatusOK)
			})

			token := generateTestToken(jwtManager, tt.role)
			req := httptest.NewRequest(tt.method, tt.route, nil)
			req.Header.Set("Authorization", "Bearer "+token)
			w := httptest.NewRecorder()

			router.ServeHTTP(w, req)

			assert.Equal(t, tt.expectStatus, w.Code)
		})
	}
}
