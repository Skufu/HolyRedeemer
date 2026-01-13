package testutil

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/holyredeemer/library-api/internal/config"
	"github.com/holyredeemer/library-api/internal/utils"
)

// TestConfig returns a test configuration
func TestConfig() *config.Config {
	return &config.Config{
		Port:                  "8080",
		Environment:           "test",
		DatabaseURL:           "postgres://test:test@localhost:5432/test_db?sslmode=disable",
		JWTAccessSecret:       "test-access-secret-key-for-testing-only",
		JWTRefreshSecret:      "test-refresh-secret-key-for-testing-only",
		JWTAccessExpiry:       15 * time.Minute,
		JWTRefreshExpiry:      7 * 24 * time.Hour,
		CORSOrigins:           []string{"http://localhost:3000"},
		DefaultLoanDays:       14,
		DefaultMaxBooks:       5,
		DefaultFinePerDay:     5.0,
		DefaultGracePeriod:    1,
		DefaultMaxFineCap:     500.0,
		DefaultBlockThreshold: 100.0,
	}
}

// TestJWTManager returns a JWT manager for testing
func TestJWTManager(t *testing.T) *utils.JWTManager {
	cfg := TestConfig()
	return utils.NewJWTManager(
		cfg.JWTAccessSecret,
		cfg.JWTRefreshSecret,
		cfg.JWTAccessExpiry,
		cfg.JWTRefreshExpiry,
	)
}

// TestContext returns a context for testing with timeout
func TestContext() context.Context {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	return ctx
}

// GenerateTestUUID generates a random UUID for testing
func GenerateTestUUID() uuid.UUID {
	return uuid.New()
}

// TestUserData holds test user information
type TestUserData struct {
	ID           uuid.UUID
	Username     string
	PasswordHash string
	Role         string
	Email        string
	Name         string
}

// GetTestAdmin returns test admin data
func GetTestAdmin() TestUserData {
	hash, _ := utils.HashPassword("admin123")
	return TestUserData{
		ID:           uuid.MustParse("11111111-1111-1111-1111-111111111111"),
		Username:     "admin",
		PasswordHash: hash,
		Role:         "admin",
		Email:        "admin@holyredeemer.edu.ph",
		Name:         "System Administrator",
	}
}

// GetTestLibrarian returns test librarian data
func GetTestLibrarian() TestUserData {
	hash, _ := utils.HashPassword("librarian123")
	return TestUserData{
		ID:           uuid.MustParse("22222222-2222-2222-2222-222222222222"),
		Username:     "librarian",
		PasswordHash: hash,
		Role:         "librarian",
		Email:        "librarian@holyredeemer.edu.ph",
		Name:         "Test Librarian",
	}
}

// GetTestStudent returns test student data
func GetTestStudent() TestUserData {
	hash, _ := utils.HashPassword("student123")
	return TestUserData{
		ID:           uuid.MustParse("33333333-3333-3333-3333-333333333333"),
		Username:     "student",
		PasswordHash: hash,
		Role:         "student",
		Email:        "student@holyredeemer.edu.ph",
		Name:         "Test Student",
	}
}
