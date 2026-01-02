package middleware

import (
	"log"
	"time"

	"github.com/gin-gonic/gin"
)

// Logger creates a custom logging middleware
func Logger() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Start timer
		start := time.Now()
		path := c.Request.URL.Path
		raw := c.Request.URL.RawQuery

		// Process request
		c.Next()

		// Calculate latency
		latency := time.Since(start)

		// Get status code
		statusCode := c.Writer.Status()

		// Build log message
		if raw != "" {
			path = path + "?" + raw
		}

		log.Printf("[%s] %d | %13v | %15s | %s %s",
			time.Now().Format("2006/01/02 - 15:04:05"),
			statusCode,
			latency,
			c.ClientIP(),
			c.Request.Method,
			path,
		)
	}
}

// Recovery returns a middleware that recovers from panics
func Recovery() gin.HandlerFunc {
	return gin.Recovery()
}
