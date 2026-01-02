package middleware

import (
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/holyredeemer/library-api/internal/utils"
	"github.com/holyredeemer/library-api/pkg/response"
)

const (
	// AuthUserKey is the key used to store the authenticated user in context
	AuthUserKey = "auth_user"
)

// AuthUser represents the authenticated user stored in context
type AuthUser struct {
	ID       string
	Username string
	Role     string
}

// Auth creates authentication middleware
func Auth(jwtManager *utils.JWTManager) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			response.Unauthorized(c, "Authorization header is required")
			c.Abort()
			return
		}

		// Check for Bearer token
		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
			response.Unauthorized(c, "Invalid authorization header format")
			c.Abort()
			return
		}

		tokenString := parts[1]
		claims, err := jwtManager.ValidateAccessToken(tokenString)
		if err != nil {
			response.Unauthorized(c, "Invalid or expired token")
			c.Abort()
			return
		}

		// Store user info in context
		c.Set(AuthUserKey, &AuthUser{
			ID:       claims.UserID.String(),
			Username: claims.Username,
			Role:     claims.Role,
		})

		c.Next()
	}
}

// RequireRoles creates middleware that requires specific roles
func RequireRoles(roles ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		user, exists := c.Get(AuthUserKey)
		if !exists {
			response.Unauthorized(c, "User not authenticated")
			c.Abort()
			return
		}

		authUser, ok := user.(*AuthUser)
		if !ok {
			response.InternalError(c, "Invalid user context")
			c.Abort()
			return
		}

		// Check if user's role is in allowed roles
		for _, role := range roles {
			if authUser.Role == role {
				c.Next()
				return
			}
		}

		response.Forbidden(c, "Insufficient permissions")
		c.Abort()
	}
}

// GetAuthUser retrieves the authenticated user from context
func GetAuthUser(c *gin.Context) *AuthUser {
	user, exists := c.Get(AuthUserKey)
	if !exists {
		return nil
	}
	authUser, ok := user.(*AuthUser)
	if !ok {
		return nil
	}
	return authUser
}

// OptionalAuth creates middleware that validates token if present but doesn't require it
func OptionalAuth(jwtManager *utils.JWTManager) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.Next()
			return
		}

		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
			c.Next()
			return
		}

		tokenString := parts[1]
		claims, err := jwtManager.ValidateAccessToken(tokenString)
		if err != nil {
			c.Next()
			return
		}

		c.Set(AuthUserKey, &AuthUser{
			ID:       claims.UserID.String(),
			Username: claims.Username,
			Role:     claims.Role,
		})

		c.Next()
	}
}
