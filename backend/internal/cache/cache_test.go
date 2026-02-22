package cache

import (
	"fmt"
	"testing"
)

func TestCachePrefixDeletion(t *testing.T) {
	c := New()
	defer c.Clear()

	// Add items with different prefixes
	c.Set("users:1:profile", "user1", 0)
	c.Set("users:2:profile", "user2", 0)
	c.Set("books:list:all", "bookList", 0)
	c.Set("books:detail:1", "book1", 0)
	c.Set("books:detail:2", "book2", 0)

	// Validate insertion
	if val, ok := c.Get("books:list:all"); !ok || val != "bookList" {
		t.Errorf("expected bookList, got %v", val)
	}

	// Delete specific prefix
	c.DeletePrefix("books:detail")

	// Verify books:detail is gone
	if _, ok := c.Get("books:detail:1"); ok {
		t.Errorf("books:detail:1 should be deleted")
	}
	if _, ok := c.Get("books:detail:2"); ok {
		t.Errorf("books:detail:2 should be deleted")
	}

	// Verify other prefixes are still there
	if _, ok := c.Get("books:list:all"); !ok {
		t.Errorf("books:list:all should NOT be deleted")
	}
	if _, ok := c.Get("users:1:profile"); !ok {
		t.Errorf("users:1:profile should NOT be deleted")
	}

	// Delete partial prefix fallback test
	c.DeletePrefix("books:")
	if _, ok := c.Get("books:list:all"); ok {
		t.Errorf("books:list:all should be deleted by fallback prefix deletion")
	}
}

func BenchmarkDeletePrefix_O_K_Optimization(b *testing.B) {
	c := New()

	for i := 0; i < 10000; i++ {
		c.Set(fmt.Sprintf("other:data:%d", i), i, 0)
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		// Set items we want to delete to simulate active load
		c.Set(fmt.Sprintf("target:data:%d", i), i, 0)
		c.Set(fmt.Sprintf("target:data:%d", i+1), i+1, 0)

		// This should be fast, finding only "target:data" and ignoring the 10,000 "other:data"
		c.DeletePrefix("target:data")
	}
}
