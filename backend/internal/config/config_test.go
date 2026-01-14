package config

import (
	"os"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestLoad_MissingJWTSecrets(t *testing.T) {
	// Clear JWT secrets from environment
	os.Unsetenv("JWT_ACCESS_SECRET")
	os.Unsetenv("JWT_REFRESH_SECRET")

	// Should panic when JWT secrets are not set
	assert.Panics(t, func() {
		Load()
	}, "Load should panic when JWT_ACCESS_SECRET is not set")

	assert.Panics(t, func() {
		Load()
	}, "Load should panic when JWT_REFRESH_SECRET is not set")
}

func TestLoad_ShortJWTSecrets(t *testing.T) {
	// Set JWT secrets with insufficient entropy (less than 32 chars)
	os.Setenv("JWT_ACCESS_SECRET", "short")
	os.Setenv("JWT_REFRESH_SECRET", "also-short")
	os.Setenv("DATABASE_URL", "postgres://test:test@localhost/test")

	assert.Panics(t, func() {
		Load()
	}, "Load should panic when JWT_ACCESS_SECRET is less than 32 characters")

	assert.Panics(t, func() {
		Load()
	}, "Load should panic when JWT_REFRESH_SECRET is less than 32 characters")
}

func TestLoad_ValidJWTSecrets(t *testing.T) {
	// Set valid JWT secrets (32+ chars)
	os.Setenv("JWT_ACCESS_SECRET", "this-is-a-valid-jwt-secret-for-testing-32chars")
	os.Setenv("JWT_REFRESH_SECRET", "this-is-another-valid-secret-32-chars-long")
	os.Setenv("DATABASE_URL", "postgres://test:test@localhost/test")

	cfg := Load()
	assert.NotEmpty(t, cfg.JWTAccessSecret)
	assert.NotEmpty(t, cfg.JWTRefreshSecret)
	assert.GreaterOrEqual(t, len(cfg.JWTAccessSecret), 32, "JWT_ACCESS_SECRET should be at least 32 characters")
	assert.GreaterOrEqual(t, len(cfg.JWTRefreshSecret), 32, "JWT_REFRESH_SECRET should be at least 32 characters")
}

func TestLoad_DefaultValues(t *testing.T) {
	// Set required values
	os.Setenv("JWT_ACCESS_SECRET", "valid-jwt-secret-32-characters-long-key")
	os.Setenv("JWT_REFRESH_SECRET", "another-valid-secret-32-characters-key")
	os.Setenv("DATABASE_URL", "postgres://test:test@localhost/test")

	// Clear optional values to test defaults
	os.Unsetenv("PORT")
	os.Unsetenv("ENVIRONMENT")
	os.Unsetenv("DEFAULT_LOAN_DAYS")
	os.Unsetenv("DEFAULT_MAX_BOOKS")
	os.Unsetenv("DEFAULT_FINE_PER_DAY")
	os.Unsetenv("DEFAULT_GRACE_PERIOD")
	os.Unsetenv("DEFAULT_MAX_FINE_CAP")
	os.Unsetenv("DEFAULT_BLOCK_THRESHOLD")
	os.Unsetenv("CORS_ORIGINS")

	cfg := Load()

	// Verify defaults are set correctly
	assert.Equal(t, "8080", cfg.Port, "Default PORT should be 8080")
	assert.Equal(t, "development", cfg.Environment, "Default ENVIRONMENT should be development")
	assert.Equal(t, 7, cfg.DefaultLoanDays, "Default DEFAULT_LOAN_DAYS should be 7")
	assert.Equal(t, 3, cfg.DefaultMaxBooks, "Default DEFAULT_MAX_BOOKS should be 3")
	assert.Equal(t, 5.0, cfg.DefaultFinePerDay, "Default DEFAULT_FINE_PER_DAY should be 5.0")
	assert.Equal(t, 1, cfg.DefaultGracePeriod, "Default DEFAULT_GRACE_PERIOD should be 1")
	assert.Equal(t, 200.0, cfg.DefaultMaxFineCap, "Default DEFAULT_MAX_FINE_CAP should be 200.0")
	assert.Equal(t, 100.0, cfg.DefaultBlockThreshold, "Default DEFAULT_BLOCK_THRESHOLD should be 100.0")
	assert.Contains(t, cfg.CORSOrigins, "http://localhost:5173", "CORS_ORIGINS should contain default frontend URL")
}

func TestLoad_CustomValues(t *testing.T) {
	// Set custom values
	os.Setenv("JWT_ACCESS_SECRET", "valid-jwt-secret-32-characters-long-key")
	os.Setenv("JWT_REFRESH_SECRET", "another-valid-secret-32-characters-key")
	os.Setenv("DATABASE_URL", "postgres://test:test@localhost/test")
	os.Setenv("PORT", "9090")
	os.Setenv("ENVIRONMENT", "production")
	os.Setenv("DEFAULT_LOAN_DAYS", "14")
	os.Setenv("DEFAULT_MAX_BOOKS", "5")
	os.Setenv("DEFAULT_FINE_PER_DAY", "10")
	os.Setenv("DEFAULT_GRACE_PERIOD", "3")
	os.Setenv("DEFAULT_MAX_FINE_CAP", "500")
	os.Setenv("DEFAULT_BLOCK_THRESHOLD", "200")

	cfg := Load()

	// Verify custom values are applied
	assert.Equal(t, "9090", cfg.Port)
	assert.Equal(t, "production", cfg.Environment)
	assert.Equal(t, 14, cfg.DefaultLoanDays)
	assert.Equal(t, 5, cfg.DefaultMaxBooks)
	assert.Equal(t, 10.0, cfg.DefaultFinePerDay)
	assert.Equal(t, 3, cfg.DefaultGracePeriod)
	assert.Equal(t, 500.0, cfg.DefaultMaxFineCap)
	assert.Equal(t, 200.0, cfg.DefaultBlockThreshold)
}
