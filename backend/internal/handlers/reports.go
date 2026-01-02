package handlers

import (
	"github.com/gin-gonic/gin"
	"github.com/holyredeemer/library-api/internal/repositories/sqlcdb"
	"github.com/holyredeemer/library-api/pkg/response"
)

type ReportHandler struct {
	queries *sqlcdb.Queries
}

func NewReportHandler(queries *sqlcdb.Queries) *ReportHandler {
	return &ReportHandler{queries: queries}
}

// DashboardStatsResponse matches frontend DashboardStats interface
type DashboardStatsResponse struct {
	TotalBooks     int64   `json:"totalBooks"`
	TotalCopies    int64   `json:"totalCopies"`
	ActiveStudents int64   `json:"activeStudents"`
	CurrentLoans   int64   `json:"currentLoans"`
	OverdueBooks   int64   `json:"overdueBooks"`
	TotalFines     float64 `json:"totalFines"`
	CheckoutsToday int64   `json:"checkoutsToday"`
	ReturnsToday   int64   `json:"returnsToday"`
	DueToday       int64   `json:"dueToday"`
}

// GetDashboardStats returns dashboard statistics
func (h *ReportHandler) GetDashboardStats(c *gin.Context) {
	stats, err := h.queries.GetDashboardStats(c.Request.Context())
	if err != nil {
		response.InternalError(c, "Failed to fetch dashboard stats")
		return
	}

	response.Success(c, DashboardStatsResponse{
		TotalBooks:     stats.TotalBooks,
		TotalCopies:    stats.TotalCopies,
		ActiveStudents: stats.ActiveStudents,
		CurrentLoans:   stats.CurrentLoans,
		OverdueBooks:   stats.OverdueBooks,
		TotalFines:     stats.TotalFines,
		CheckoutsToday: stats.CheckoutsToday,
		ReturnsToday:   stats.ReturnsToday,
		DueToday:       stats.DueToday,
	}, "")
}

// ChartDataPoint matches frontend ChartDataPoint interface
type ChartDataPoint struct {
	Name  string `json:"name"`
	Value int64  `json:"value"`
	Fill  string `json:"fill,omitempty"`
}

// GetBooksByCategory returns books grouped by category for pie chart
func (h *ReportHandler) GetBooksByCategory(c *gin.Context) {
	data, err := h.queries.GetBooksByCategory(c.Request.Context())
	if err != nil {
		response.InternalError(c, "Failed to fetch category data")
		return
	}

	chartData := make([]ChartDataPoint, len(data))
	for i, d := range data {
		chartData[i] = ChartDataPoint{
			Name:  d.Name,
			Value: d.Count,
			Fill:  fromPgText(d.ColorCode),
		}
	}

	response.Success(c, chartData, "")
}

// TrendDataPoint matches frontend TrendDataPoint interface
type TrendDataPoint struct {
	Month     string `json:"month"`
	Checkouts int64  `json:"checkouts"`
	Returns   int64  `json:"returns"`
}

// GetMonthlyTrends returns monthly checkout/return trends
func (h *ReportHandler) GetMonthlyTrends(c *gin.Context) {
	data, err := h.queries.GetMonthlyTrends(c.Request.Context())
	if err != nil {
		response.InternalError(c, "Failed to fetch trend data")
		return
	}

	trendData := make([]TrendDataPoint, len(data))
	for i, d := range data {
		trendData[i] = TrendDataPoint{
			Month:     d.Month, // Already a string
			Checkouts: d.Checkouts,
			Returns:   d.Returns,
		}
	}

	response.Success(c, trendData, "")
}

// GetTopBorrowedBooks returns top borrowed books for bar chart
func (h *ReportHandler) GetTopBorrowedBooks(c *gin.Context) {
	data, err := h.queries.GetTopBorrowedBooks(c.Request.Context())
	if err != nil {
		response.InternalError(c, "Failed to fetch top books")
		return
	}

	chartData := make([]ChartDataPoint, len(data))
	for i, d := range data {
		chartData[i] = ChartDataPoint{
			Name:  d.Title,
			Value: d.BorrowCount,
		}
	}

	response.Success(c, chartData, "")
}

// ActivityItem represents a recent activity entry
type ActivityItem struct {
	ID          string `json:"id"`
	Type        string `json:"type"`
	Description string `json:"description"`
	Time        string `json:"time"`
}

// GetRecentActivity returns recent library activity
func (h *ReportHandler) GetRecentActivity(c *gin.Context) {
	data, err := h.queries.GetRecentActivity(c.Request.Context())
	if err != nil {
		response.InternalError(c, "Failed to fetch activity")
		return
	}

	activities := make([]ActivityItem, len(data))
	for i, d := range data {
		description := ""
		switch d.ActivityType {
		case "checkout":
			description = d.StudentName + " borrowed \"" + d.BookTitle + "\""
		case "return":
			description = d.StudentName + " returned \"" + d.BookTitle + "\""
		case "overdue":
			description = "Overdue: \"" + d.BookTitle + "\" by " + d.StudentName
		}

		activities[i] = ActivityItem{
			ID:          d.ID.String(),
			Type:        d.ActivityType,
			Description: description,
			Time:        fromPgTimestamp(d.ActivityTime).Format("2006-01-02 15:04"),
		}
	}

	response.Success(c, activities, "")
}
