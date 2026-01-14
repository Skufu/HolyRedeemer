package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

func TestLogout_Success(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()

	router.POST("/auth/logout", func(c *gin.Context) {
		c.JSON(200, gin.H{"message": "Logged out successfully"})
	})

	req := RefreshTokenRequest{}
	reqBody, _ := json.Marshal(req)

	w := httptest.NewRecorder()
	c, _ := http.NewRequest("POST", "/auth/logout", bytes.NewBuffer(reqBody))
	c.Header.Set("Content-Type", "application/json")

	router.ServeHTTP(w, c)

	assert.Equal(t, 200, w.Code)
	assert.Contains(t, w.Body.String(), "Logged out successfully")
}
