package handlers

import (
	"github.com/gin-gonic/gin"
	"github.com/holyredeemer/library-api/internal/cache"
	"github.com/holyredeemer/library-api/pkg/response"
)

type CacheAdminHandler struct {
	cache *cache.Cache
}

func NewCacheAdminHandler(cache *cache.Cache) *CacheAdminHandler {
	return &CacheAdminHandler{cache: cache}
}

func (h *CacheAdminHandler) Clear(c *gin.Context) {
	h.cache.Clear()
	response.Success(c, nil, "Cache cleared")
}
