package handlers

import (
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/holyredeemer/library-api/internal/repositories/sqlcdb"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/stretchr/testify/assert"
)

func TestReserveBook_Validation(t *testing.T) {
	t.Run("Valid request with notes", func(t *testing.T) {
		req := ReserveBookRequest{
			BookID: "550e8400-e29b-41d4-a716-446655440000",
			Notes:  "Need this for my research paper",
		}
		assert.Equal(t, "550e8400-e29b-41d4-a716-446655440000", req.BookID)
		assert.Equal(t, "Need this for my research paper", req.Notes)
	})

	t.Run("Valid request without notes", func(t *testing.T) {
		req := ReserveBookRequest{
			BookID: "550e8400-e29b-41d4-a716-446655440000",
			Notes:  "",
		}
		assert.Equal(t, "550e8400-e29b-41d4-a716-446655440000", req.BookID)
		assert.Equal(t, "", req.Notes)
	})
}

func TestStudentHandler_HelperFunctions(t *testing.T) {
	t.Run("GetTransactionStatus_Valid", func(t *testing.T) {
		status := sqlcdb.NullTransactionStatus{
			TransactionStatus: sqlcdb.TransactionStatusBorrowed,
			Valid:             true,
		}
		result := getTransactionStatus(status)
		assert.Equal(t, "borrowed", result)
	})

	t.Run("GetTransactionStatus_Invalid", func(t *testing.T) {
		status := sqlcdb.NullTransactionStatus{Valid: false}
		result := getTransactionStatus(status)
		assert.Equal(t, "borrowed", result)
	})

	t.Run("GetTransactionStatus_Overdue", func(t *testing.T) {
		status := sqlcdb.NullTransactionStatus{
			TransactionStatus: sqlcdb.TransactionStatusOverdue,
			Valid:             true,
		}
		result := getTransactionStatus(status)
		assert.Equal(t, "overdue", result)
	})

	t.Run("GetTransactionStatus_Returned", func(t *testing.T) {
		status := sqlcdb.NullTransactionStatus{
			TransactionStatus: sqlcdb.TransactionStatusReturned,
			Valid:             true,
		}
		result := getTransactionStatus(status)
		assert.Equal(t, "returned", result)
	})

	t.Run("GetFineStatus_Valid", func(t *testing.T) {
		status := sqlcdb.NullFineStatus{
			FineStatus: sqlcdb.FineStatusPending,
			Valid:      true,
		}
		result := getFineStatus(status)
		assert.Equal(t, "pending", result)
	})

	t.Run("GetFineStatus_Invalid", func(t *testing.T) {
		status := sqlcdb.NullFineStatus{Valid: false}
		result := getFineStatus(status)
		assert.Equal(t, "pending", result)
	})

	t.Run("GetFineStatus_Paid", func(t *testing.T) {
		status := sqlcdb.NullFineStatus{
			FineStatus: sqlcdb.FineStatusPaid,
			Valid:      true,
		}
		result := getFineStatus(status)
		assert.Equal(t, "paid", result)
	})

	t.Run("GetFineStatus_Waived", func(t *testing.T) {
		status := sqlcdb.NullFineStatus{
			FineStatus: sqlcdb.FineStatusWaived,
			Valid:      true,
		}
		result := getFineStatus(status)
		assert.Equal(t, "waived", result)
	})
}

// TestFavoriteBookResponseMapping tests the mapping of sqlcdb.ListFavoriteBooksRow to FavoriteBookResponse
func TestFavoriteBookResponseMapping(t *testing.T) {
	// Fixed timestamp for testing
	fixedTime := time.Date(2026, 2, 10, 12, 0, 0, 0, time.UTC)

	t.Run("MapFavoriteBookRow_ValidRow", func(t *testing.T) {
		// Create a valid favorite book row
		bookID, _ := uuid.Parse("550e8400-e29b-41d4-a716-446655440000")
		favoriteRow := sqlcdb.ListFavoriteBooksRow{
			ID:        bookID,
			BookID:    bookID,
			Title:     "The Great Gatsby",
			Author:    "F. Scott Fitzgerald",
			Isbn:      pgtype.Text{String: "978-0743273565", Valid: true},
			CoverUrl:  pgtype.Text{String: "https://example.com/covers/gatsby.jpg", Valid: true},
			CreatedAt: pgtype.Timestamptz{Time: fixedTime, Valid: true},
		}

		// Map the row
		response := mapFavoriteBookRow(favoriteRow)

		// Verify all fields are correctly mapped
		assert.Equal(t, "550e8400-e29b-41d4-a716-446655440000", response.ID)
		assert.Equal(t, "550e8400-e29b-41d4-a716-446655440000", response.BookID)
		assert.Equal(t, "The Great Gatsby", response.Title)
		assert.Equal(t, "F. Scott Fitzgerald", response.Author)
		assert.Equal(t, "978-0743273565", response.ISBN)
		assert.Equal(t, "https://example.com/covers/gatsby.jpg", response.CoverImage)
		assert.Equal(t, fixedTime, response.AddedAt)
	})

	t.Run("MapFavoriteBookRow_PgtypeTextNull", func(t *testing.T) {
		bookID, _ := uuid.Parse("550e8400-e29b-41d4-a716-446655440001")
		favoriteRow := sqlcdb.ListFavoriteBooksRow{
			ID:        bookID,
			BookID:    bookID,
			Title:     "1984",
			Author:    "George Orwell",
			Isbn:      pgtype.Text{Valid: false},
			CoverUrl:  pgtype.Text{String: "https://example.com/covers/1984.jpg", Valid: true},
			CreatedAt: pgtype.Timestamptz{Time: fixedTime, Valid: true},
		}

		response := mapFavoriteBookRow(favoriteRow)

		assert.Equal(t, "", response.ISBN)
		assert.Equal(t, "https://example.com/covers/1984.jpg", response.CoverImage)
	})

	t.Run("MapFavoriteBookRow_BothPgtypeTextNull", func(t *testing.T) {
		bookID, _ := uuid.Parse("550e8400-e29b-41d4-a716-446655440002")
		favoriteRow := sqlcdb.ListFavoriteBooksRow{
			ID:        bookID,
			BookID:    bookID,
			Title:     "Pride and Prejudice",
			Author:    "Jane Austen",
			Isbn:      pgtype.Text{Valid: false},
			CoverUrl:  pgtype.Text{Valid: false},
			CreatedAt: pgtype.Timestamptz{Time: fixedTime, Valid: true},
		}

		response := mapFavoriteBookRow(favoriteRow)

		assert.Equal(t, "", response.ISBN)
		assert.Equal(t, "", response.CoverImage)
	})

	t.Run("MapFavoriteBookRow_TimestamptzValid", func(t *testing.T) {
		bookID, _ := uuid.Parse("550e8400-e29b-41d4-a716-446655440003")
		favoriteRow := sqlcdb.ListFavoriteBooksRow{
			ID:        bookID,
			BookID:    bookID,
			Title:     "To Kill a Mockingbird",
			Author:    "Harper Lee",
			Isbn:      pgtype.Text{String: "978-0061120084", Valid: true},
			CoverUrl:  pgtype.Text{Valid: false},
			CreatedAt: pgtype.Timestamptz{Time: fixedTime, Valid: true},
		}

		response := mapFavoriteBookRow(favoriteRow)

		assert.Equal(t, fixedTime, response.AddedAt)
	})

	t.Run("MapFavoriteBookRow_TimestamptzNull", func(t *testing.T) {
		bookID, _ := uuid.Parse("550e8400-e29b-41d4-a716-446655440004")
		favoriteRow := sqlcdb.ListFavoriteBooksRow{
			ID:        bookID,
			BookID:    bookID,
			Title:     "Brave New World",
			Author:    "Aldous Huxley",
			Isbn:      pgtype.Text{String: "978-0060850524", Valid: true},
			CoverUrl:  pgtype.Text{Valid: false},
			CreatedAt: pgtype.Timestamptz{Valid: false},
		}

		response := mapFavoriteBookRow(favoriteRow)

		// When Timestamptz is null, Time should be zero
		assert.True(t, response.AddedAt.IsZero())
	})
}

// TestAchievementResponseMapping tests the mapping of sqlcdb.GetStudentAchievementsRow to AchievementResponse
func TestAchievementResponseMapping(t *testing.T) {
	// Fixed timestamp for testing
	fixedTime := time.Date(2026, 2, 10, 15, 30, 0, 0, time.UTC)

	t.Run("MapAchievementRow_UnlockedAchievement", func(t *testing.T) {
		achID, _ := uuid.Parse("550e8400-e29b-41d4-a716-446655440000")
		achievementRow := sqlcdb.GetStudentAchievementsRow{
			ID:               achID,
			Code:             "FIRST_BOOK",
			Name:             "First Book Borrowed",
			Description:      "Borrow your first book from the library",
			Icon:             pgtype.Text{String: "📚", Valid: true},
			Color:            pgtype.Text{String: "#FFD700", Valid: true},
			RequirementType:  "BORROW_COUNT",
			RequirementValue: 1,
			UnlockedAt:       pgtype.Timestamptz{Time: fixedTime, Valid: true},
		}

		response := mapAchievementRow(achievementRow)

		assert.Equal(t, "550e8400-e29b-41d4-a716-446655440000", response.ID)
		assert.Equal(t, "FIRST_BOOK", response.Code)
		assert.Equal(t, "First Book Borrowed", response.Name)
		assert.Equal(t, "Borrow your first book from the library", response.Description)
		assert.Equal(t, "📚", response.Icon)
		assert.Equal(t, "#FFD700", response.Color)
		assert.Equal(t, "BORROW_COUNT", response.RequirementType)
		assert.Equal(t, int32(1), response.RequirementValue)
		assert.True(t, response.IsUnlocked)
		assert.Equal(t, fixedTime, response.UnlockedAt)
	})

	t.Run("MapAchievementRow_PgtypeTextNull", func(t *testing.T) {
		achID, _ := uuid.Parse("550e8400-e29b-41d4-a716-446655440001")
		achievementRow := sqlcdb.GetStudentAchievementsRow{
			ID:               achID,
			Code:             "DIDNT_CATCH_UP",
			Name:             "Oops",
			Description:      "You missed a due date",
			Icon:             pgtype.Text{Valid: false},
			Color:            pgtype.Text{String: "#FF0000", Valid: true},
			RequirementType:  "MISSED_DUE",
			RequirementValue: 1,
			UnlockedAt:       pgtype.Timestamptz{Time: fixedTime, Valid: true},
		}

		response := mapAchievementRow(achievementRow)

		assert.Equal(t, "", response.Icon)
		assert.Equal(t, "#FF0000", response.Color)
	})

	t.Run("MapAchievementRow_BothPgtypeTextNull", func(t *testing.T) {
		achID, _ := uuid.Parse("550e8400-e29b-41d4-a716-446655440002")
		achievementRow := sqlcdb.GetStudentAchievementsRow{
			ID:               achID,
			Code:             "SOBER",
			Name:             "Perfect Attendance",
			Description:      "No overdue books for a semester",
			Icon:             pgtype.Text{Valid: false},
			Color:            pgtype.Text{Valid: false},
			RequirementType:  "NO_OVERDUE",
			RequirementValue: 100,
			UnlockedAt:       pgtype.Timestamptz{Time: fixedTime, Valid: true},
		}

		response := mapAchievementRow(achievementRow)

		assert.Equal(t, "", response.Icon)
		assert.Equal(t, "", response.Color)
	})

	t.Run("MapAchievementRow_UnlockedAtValid", func(t *testing.T) {
		achID, _ := uuid.Parse("550e8400-e29b-41d4-a716-446655440003")
		achievementRow := sqlcdb.GetStudentAchievementsRow{
			ID:               achID,
			Code:             "CHAMPION",
			Name:             "Century Club",
			Description:      "Read 100 books",
			Icon:             pgtype.Text{String: "🏆", Valid: true},
			Color:            pgtype.Text{String: "#00FF00", Valid: true},
			RequirementType:  "TOTAL_READS",
			RequirementValue: 100,
			UnlockedAt:       pgtype.Timestamptz{Time: fixedTime, Valid: true},
		}

		response := mapAchievementRow(achievementRow)

		assert.True(t, response.IsUnlocked)
		assert.Equal(t, fixedTime, response.UnlockedAt)
	})

	t.Run("MapAchievementRow_UnlockedAtNull", func(t *testing.T) {
		achID, _ := uuid.Parse("550e8400-e29b-41d4-a716-446655440004")
		achievementRow := sqlcdb.GetStudentAchievementsRow{
			ID:               achID,
			Code:             "NOT_YET",
			Name:             "Still To Unlock",
			Description:      "This achievement hasn't been unlocked yet",
			Icon:             pgtype.Text{String: "🔒", Valid: true},
			Color:            pgtype.Text{String: "#808080", Valid: true},
			RequirementType:  "BORROW_COUNT",
			RequirementValue: 50,
			UnlockedAt:       pgtype.Timestamptz{Valid: false},
		}

		response := mapAchievementRow(achievementRow)

		assert.False(t, response.IsUnlocked)
		// When UnlockedAt is null, it should remain zero
		assert.True(t, response.UnlockedAt.IsZero())
	})

	t.Run("MapAchievementRow_MultipleFields", func(t *testing.T) {
		achID, _ := uuid.Parse("550e8400-e29b-41d4-a716-446655440005")
		achievementRow := sqlcdb.GetStudentAchievementsRow{
			ID:               achID,
			Code:             "HELPFUL",
			Name:             "Book Hero",
			Description:      "Helped 50 other students find books",
			Icon:             pgtype.Text{String: "🦸", Valid: true},
			Color:            pgtype.Text{String: "#FF6600", Valid: true},
			RequirementType:  "ASSISTS",
			RequirementValue: 50,
			UnlockedAt:       pgtype.Timestamptz{Time: fixedTime, Valid: true},
		}

		response := mapAchievementRow(achievementRow)

		assert.Equal(t, "HELPFUL", response.Code)
		assert.Equal(t, "Book Hero", response.Name)
		assert.Equal(t, "Helped 50 other students find books", response.Description)
		assert.Equal(t, "🦸", response.Icon)
		assert.Equal(t, "#FF6600", response.Color)
		assert.Equal(t, "ASSISTS", response.RequirementType)
		assert.Equal(t, int32(50), response.RequirementValue)
		assert.True(t, response.IsUnlocked)
		assert.Equal(t, fixedTime, response.UnlockedAt)
	})
}
