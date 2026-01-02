package config

import (
	"os"
	"strconv"
	"time"
)

// Config holds all application configuration
type Config struct {
	// Server
	Port        string
	Environment string

	// Database
	DatabaseURL string

	// JWT
	JWTAccessSecret  string
	JWTRefreshSecret string
	JWTAccessExpiry  time.Duration
	JWTRefreshExpiry time.Duration

	// CORS
	CORSOrigins []string

	// Library Settings (defaults, can be overridden from DB)
	DefaultLoanDays     int
	DefaultMaxBooks     int
	DefaultFinePerDay   float64
	DefaultGracePeriod  int
	DefaultMaxFineCap   float64
	DefaultBlockThreshold float64
}

// Load reads configuration from environment variables
func Load() *Config {
	return &Config{
		// Server
		Port:        getEnv("PORT", "8080"),
		Environment: getEnv("ENVIRONMENT", "development"),

		// Database
		DatabaseURL: getEnv("DATABASE_URL", ""),

		// JWT
		JWTAccessSecret:  getEnv("JWT_ACCESS_SECRET", "dev-access-secret-change-in-production"),
		JWTRefreshSecret: getEnv("JWT_REFRESH_SECRET", "dev-refresh-secret-change-in-production"),
		JWTAccessExpiry:  getDurationEnv("JWT_ACCESS_EXPIRY", 15*time.Minute),
		JWTRefreshExpiry: getDurationEnv("JWT_REFRESH_EXPIRY", 7*24*time.Hour),

		// CORS
		CORSOrigins: getEnvSlice("CORS_ORIGINS", []string{"http://localhost:5173", "http://localhost:3000"}),

		// Library defaults
		DefaultLoanDays:       getIntEnv("DEFAULT_LOAN_DAYS", 7),
		DefaultMaxBooks:       getIntEnv("DEFAULT_MAX_BOOKS", 3),
		DefaultFinePerDay:     getFloatEnv("DEFAULT_FINE_PER_DAY", 5.0),
		DefaultGracePeriod:    getIntEnv("DEFAULT_GRACE_PERIOD", 1),
		DefaultMaxFineCap:     getFloatEnv("DEFAULT_MAX_FINE_CAP", 200.0),
		DefaultBlockThreshold: getFloatEnv("DEFAULT_BLOCK_THRESHOLD", 100.0),
	}
}

// Helper functions
func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getIntEnv(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if intVal, err := strconv.Atoi(value); err == nil {
			return intVal
		}
	}
	return defaultValue
}

func getFloatEnv(key string, defaultValue float64) float64 {
	if value := os.Getenv(key); value != "" {
		if floatVal, err := strconv.ParseFloat(value, 64); err == nil {
			return floatVal
		}
	}
	return defaultValue
}

func getDurationEnv(key string, defaultValue time.Duration) time.Duration {
	if value := os.Getenv(key); value != "" {
		if duration, err := time.ParseDuration(value); err == nil {
			return duration
		}
	}
	return defaultValue
}

func getEnvSlice(key string, defaultValue []string) []string {
	if value := os.Getenv(key); value != "" {
		// Simple comma-separated parsing
		var result []string
		current := ""
		for _, char := range value {
			if char == ',' {
				if current != "" {
					result = append(result, current)
					current = ""
				}
			} else {
				current += string(char)
			}
		}
		if current != "" {
			result = append(result, current)
		}
		return result
	}
	return defaultValue
}
