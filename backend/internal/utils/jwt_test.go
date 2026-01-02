package utils

import (
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestJWTManager_GenerateAccessToken(t *testing.T) {
	manager := NewJWTManager(
		"test-access-secret",
		"test-refresh-secret",
		15*time.Minute,
		7*24*time.Hour,
	)

	userID := uuid.New()
	username := "testuser"
	role := "student"

	token, err := manager.GenerateAccessToken(userID, username, role)
	require.NoError(t, err)
	assert.NotEmpty(t, token)

	// Validate the token
	claims, err := manager.ValidateAccessToken(token)
	require.NoError(t, err)
	assert.Equal(t, userID, claims.UserID)
	assert.Equal(t, username, claims.Username)
	assert.Equal(t, role, claims.Role)
}

func TestJWTManager_GenerateTokenPair(t *testing.T) {
	manager := NewJWTManager(
		"test-access-secret",
		"test-refresh-secret",
		15*time.Minute,
		7*24*time.Hour,
	)

	userID := uuid.New()
	username := "testuser"
	role := "librarian"

	accessToken, refreshToken, err := manager.GenerateTokenPair(userID, username, role)
	require.NoError(t, err)
	assert.NotEmpty(t, accessToken)
	assert.NotEmpty(t, refreshToken)
	assert.NotEqual(t, accessToken, refreshToken)

	// Validate access token
	accessClaims, err := manager.ValidateAccessToken(accessToken)
	require.NoError(t, err)
	assert.Equal(t, userID, accessClaims.UserID)

	// Validate refresh token
	refreshClaims, err := manager.ValidateRefreshToken(refreshToken)
	require.NoError(t, err)
	assert.Equal(t, userID, refreshClaims.UserID)
}

func TestJWTManager_InvalidToken(t *testing.T) {
	manager := NewJWTManager(
		"test-access-secret",
		"test-refresh-secret",
		15*time.Minute,
		7*24*time.Hour,
	)

	// Test with invalid token
	_, err := manager.ValidateAccessToken("invalid-token")
	assert.Error(t, err)

	// Test with wrong secret
	otherManager := NewJWTManager(
		"different-secret",
		"different-refresh-secret",
		15*time.Minute,
		7*24*time.Hour,
	)

	userID := uuid.New()
	token, _ := manager.GenerateAccessToken(userID, "test", "student")
	_, err = otherManager.ValidateAccessToken(token)
	assert.Error(t, err)
}

func TestJWTManager_ExpiredToken(t *testing.T) {
	// Create manager with very short expiry
	manager := NewJWTManager(
		"test-access-secret",
		"test-refresh-secret",
		1*time.Millisecond, // Very short expiry
		7*24*time.Hour,
	)

	userID := uuid.New()
	token, err := manager.GenerateAccessToken(userID, "test", "student")
	require.NoError(t, err)

	// Wait for token to expire
	time.Sleep(10 * time.Millisecond)

	_, err = manager.ValidateAccessToken(token)
	assert.Error(t, err)
}

func TestJWTManager_GetAccessExpiry(t *testing.T) {
	expiry := 30 * time.Minute
	manager := NewJWTManager(
		"test-access-secret",
		"test-refresh-secret",
		expiry,
		7*24*time.Hour,
	)

	assert.Equal(t, int64(1800), manager.GetAccessExpiry()) // 30 minutes in seconds
}
