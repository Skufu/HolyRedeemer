package cache

import (
	"strings"
	"sync"
	"time"
)

// Item represents a cached item with expiration
type Item struct {
	Value      interface{}
	Expiration int64
}

// IsExpired checks if the item has expired
func (i Item) IsExpired() bool {
	if i.Expiration == 0 {
		return false // No expiration
	}
	return time.Now().UnixNano() > i.Expiration
}

// Cache is a simple in-memory cache with TTL support
type Cache struct {
	items         map[string]Item
	prefixTracker map[string]map[string]struct{} // map[prefix]map[key]struct{}
	mu            sync.RWMutex
}

// New creates a new Cache instance
func New() *Cache {
	c := &Cache{
		items:         make(map[string]Item),
		prefixTracker: make(map[string]map[string]struct{}),
	}
	// Start background cleanup goroutine
	go c.startCleanup()
	return c
}

// Set stores a value in the cache with an optional TTL
func (c *Cache) Set(key string, value interface{}, ttl time.Duration) {
	var expiration int64
	if ttl > 0 {
		expiration = time.Now().Add(ttl).UnixNano()
	}

	c.mu.Lock()
	c.items[key] = Item{
		Value:      value,
		Expiration: expiration,
	}

	// Track the prefix: assuming prefix is separated by ":"
	// For example: "books:list:category" -> prefix is "books:list"
	parts := strings.Split(key, ":")
	if len(parts) > 1 {
		prefix := strings.Join(parts[:len(parts)-1], ":")
		if _, ok := c.prefixTracker[prefix]; !ok {
			c.prefixTracker[prefix] = make(map[string]struct{})
		}
		c.prefixTracker[prefix][key] = struct{}{}
	}

	c.mu.Unlock()
}

// Get retrieves a value from the cache
func (c *Cache) Get(key string) (interface{}, bool) {
	c.mu.RLock()
	item, found := c.items[key]
	c.mu.RUnlock()

	if !found {
		return nil, false
	}

	if item.IsExpired() {
		c.Delete(key)
		return nil, false
	}

	return item.Value, true
}

// Delete removes a value from the cache
func (c *Cache) Delete(key string) {
	c.mu.Lock()
	delete(c.items, key)

	// Clean up prefix tracker
	parts := strings.Split(key, ":")
	if len(parts) > 1 {
		prefix := strings.Join(parts[:len(parts)-1], ":")
		if keysMap, ok := c.prefixTracker[prefix]; ok {
			delete(keysMap, key)
			if len(keysMap) == 0 {
				delete(c.prefixTracker, prefix)
			}
		}
	}

	c.mu.Unlock()
}

func (c *Cache) DeletePrefix(prefix string) {
	c.mu.Lock()

	// Fast path: if the exact prefix exists in the tracker
	if keysMap, ok := c.prefixTracker[prefix]; ok {
		for key := range keysMap {
			delete(c.items, key)
		}
		delete(c.prefixTracker, prefix)
	} else {
		// Fallback for partial prefixes (e.g., prefix tracker has "books:detail", but we asked for "books:")
		for key := range c.items {
			if strings.HasPrefix(key, prefix) {
				delete(c.items, key)
				// Clean up tracking fallback
				parts := strings.Split(key, ":")
				if len(parts) > 1 {
					trackedPrefix := strings.Join(parts[:len(parts)-1], ":")
					if km, ok := c.prefixTracker[trackedPrefix]; ok {
						delete(km, key)
						if len(km) == 0 {
							delete(c.prefixTracker, trackedPrefix)
						}
					}
				}
			}
		}
	}
	c.mu.Unlock()
}

// Clear removes all items from the cache
func (c *Cache) Clear() {
	c.mu.Lock()
	c.items = make(map[string]Item)
	c.prefixTracker = make(map[string]map[string]struct{})
	c.mu.Unlock()
}

// startCleanup runs a background goroutine to remove expired items
func (c *Cache) startCleanup() {
	ticker := time.NewTicker(1 * time.Minute)
	defer ticker.Stop()

	for range ticker.C {
		c.mu.Lock()
		for key, item := range c.items {
			if item.IsExpired() {
				delete(c.items, key)

				// Clean up prefix tracker
				parts := strings.Split(key, ":")
				if len(parts) > 1 {
					prefix := strings.Join(parts[:len(parts)-1], ":")
					if keysMap, ok := c.prefixTracker[prefix]; ok {
						delete(keysMap, key)
						if len(keysMap) == 0 {
							delete(c.prefixTracker, prefix)
						}
					}
				}
			}
		}
		c.mu.Unlock()
	}
}
