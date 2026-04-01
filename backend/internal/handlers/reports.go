package handlers

import (
	"time"

	"github.com/gin-gonic/gin"
	"github.com/holyredeemer/library-api/internal/cache"
	"github.com/holyredeemer/library-api/internal/repositories/sqlcdb"
	"github.com/holyredeemer/library-api/pkg/response"
)

type ReportHandler struct {
	queries *sqlcdb.Queries
	cache   *cache.Cache
}

func NewReportHandler(queries *sqlcdb.Queries, cache *cache.Cache) *ReportHandler {
	return &ReportHandler{
		queries: queries,
		cache:   cache,
	}
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

const dashboardStatsTTL = 5 * time.Minute

func (h *ReportHandler) GetDashboardStats(c *gin.Context) {
	if cached, found := h.cache.Get(cache.DashboardStatsKey); found {
		response.Success(c, cached, "")
		return
	}

	stats, err := h.queries.GetDashboardStatsEnhanced(c.Request.Context())
	if err != nil {
		response.InternalError(c, "Failed to fetch dashboard stats")
		return
	}

	statsResponse := DashboardStatsEnhancedResponse{
		TotalBooks:        stats.TotalBooks,
		TotalCopies:       stats.TotalCopies,
		ActiveStudents:    stats.ActiveStudents,
		CurrentLoans:      stats.CurrentLoans,
		OverdueBooks:      stats.OverdueBooks,
		TotalFines:        stats.TotalFines,
		CheckoutsToday:    stats.CheckoutsToday,
		ReturnsToday:      stats.ReturnsToday,
		DueToday:          stats.DueToday,
		LostBooks:         stats.LostBooks,
		DamagedBooks:      stats.DamagedBooks,
		PendingIncidents:  stats.PendingIncidents,
		TotalReservations: stats.TotalReservations,
	}

	h.cache.Set(cache.DashboardStatsKey, statsResponse, dashboardStatsTTL)
	response.Success(c, statsResponse, "")
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

type GradeLevelDataPoint struct {
	GradeLevel int32 `json:"grade_level"`
	Count      int64 `json:"count"`
}

type GradeLevelFinesPoint struct {
	GradeLevel  int32   `json:"grade_level"`
	TotalAmount float64 `json:"total_amount"`
}

type CategoryUsagePoint struct {
	GradeLevel  int32  `json:"grade_level"`
	Category    string `json:"category"`
	BorrowCount int64  `json:"borrow_count"`
}

type TopBorrowedByGradePoint struct {
	GradeLevel  int32  `json:"grade_level"`
	Title       string `json:"title"`
	BorrowCount int64  `json:"borrow_count"`
}

type CirculationStatusPoint struct {
	Status string `json:"circulation_status"`
	Count  int64  `json:"count"`
}

type DamageLostStatsResponse struct {
	DamageCount int64   `json:"damage_count"`
	LostCount   int64   `json:"lost_count"`
	TotalCost   float64 `json:"total_cost"`
}

type MonthlyTrendsByYearPoint struct {
	Year      int32  `json:"year"`
	Month     string `json:"month"`
	Checkouts int64  `json:"checkouts"`
	Returns   int64  `json:"returns"`
}

type DashboardStatsEnhancedResponse struct {
	TotalBooks        int64   `json:"totalBooks"`
	TotalCopies       int64   `json:"totalCopies"`
	ActiveStudents    int64   `json:"activeStudents"`
	CurrentLoans      int64   `json:"currentLoans"`
	OverdueBooks      int64   `json:"overdueBooks"`
	TotalFines        float64 `json:"totalFines"`
	CheckoutsToday    int64   `json:"checkoutsToday"`
	ReturnsToday      int64   `json:"returnsToday"`
	DueToday          int64   `json:"dueToday"`
	LostBooks         int64   `json:"lostBooks"`
	DamagedBooks      int64   `json:"damagedBooks"`
	PendingIncidents  int64   `json:"pendingIncidents"`
	TotalReservations int64   `json:"totalReservations"`
}

func (h *ReportHandler) GetStudentsByGradeLevel(c *gin.Context) {
	data, err := h.queries.GetStudentsByGradeLevel(c.Request.Context())
	if err != nil {
		response.InternalError(c, "Failed to fetch students by grade")
		return
	}
	result := make([]GradeLevelDataPoint, len(data))
	for i, d := range data {
		result[i] = GradeLevelDataPoint{GradeLevel: d.GradeLevel, Count: d.Count}
	}
	response.Success(c, result, "")
}

func (h *ReportHandler) GetLoansByGradeLevel(c *gin.Context) {
	data, err := h.queries.GetLoansByGradeLevel(c.Request.Context())
	if err != nil {
		response.InternalError(c, "Failed to fetch loans by grade")
		return
	}
	result := make([]GradeLevelDataPoint, len(data))
	for i, d := range data {
		result[i] = GradeLevelDataPoint{GradeLevel: d.GradeLevel, Count: d.Count}
	}
	response.Success(c, result, "")
}

func (h *ReportHandler) GetOverdueByGradeLevel(c *gin.Context) {
	data, err := h.queries.GetOverdueByGradeLevel(c.Request.Context())
	if err != nil {
		response.InternalError(c, "Failed to fetch overdue by grade")
		return
	}
	result := make([]GradeLevelDataPoint, len(data))
	for i, d := range data {
		result[i] = GradeLevelDataPoint{GradeLevel: d.GradeLevel, Count: d.Count}
	}
	response.Success(c, result, "")
}

func (h *ReportHandler) GetFinesByGradeLevel(c *gin.Context) {
	data, err := h.queries.GetFinesByGradeLevel(c.Request.Context())
	if err != nil {
		response.InternalError(c, "Failed to fetch fines by grade")
		return
	}
	result := make([]GradeLevelFinesPoint, len(data))
	for i, d := range data {
		result[i] = GradeLevelFinesPoint{GradeLevel: d.GradeLevel, TotalAmount: d.TotalAmount}
	}
	response.Success(c, result, "")
}

func (h *ReportHandler) GetCategoryUsageByGradeLevel(c *gin.Context) {
	data, err := h.queries.GetCategoryUsageByGradeLevel(c.Request.Context())
	if err != nil {
		response.InternalError(c, "Failed to fetch category usage")
		return
	}
	result := make([]CategoryUsagePoint, len(data))
	for i, d := range data {
		result[i] = CategoryUsagePoint{GradeLevel: d.GradeLevel, Category: fromPgText(d.Category), BorrowCount: d.BorrowCount}
	}
	response.Success(c, result, "")
}

func (h *ReportHandler) GetTopBorrowedByGradeLevel(c *gin.Context) {
	data, err := h.queries.GetTopBorrowedByGradeLevel(c.Request.Context())
	if err != nil {
		response.InternalError(c, "Failed to fetch top borrowed by grade")
		return
	}
	result := make([]TopBorrowedByGradePoint, len(data))
	for i, d := range data {
		result[i] = TopBorrowedByGradePoint{GradeLevel: d.GradeLevel, Title: d.Title, BorrowCount: d.BorrowCount}
	}
	response.Success(c, result, "")
}

func (h *ReportHandler) GetCirculationStatusDistribution(c *gin.Context) {
	data, err := h.queries.GetCirculationStatusDistribution(c.Request.Context())
	if err != nil {
		response.InternalError(c, "Failed to fetch circulation status")
		return
	}
	result := make([]CirculationStatusPoint, len(data))
	for i, d := range data {
		result[i] = CirculationStatusPoint{Status: d.CirculationStatus, Count: d.Count}
	}
	response.Success(c, result, "")
}

func (h *ReportHandler) GetDamageLostStats(c *gin.Context) {
	data, err := h.queries.GetDamageLostStats(c.Request.Context())
	if err != nil {
		response.InternalError(c, "Failed to fetch damage/lost stats")
		return
	}
	response.Success(c, DamageLostStatsResponse{
		DamageCount: data.DamageCount,
		LostCount:   data.LostCount,
		TotalCost:   data.TotalCost,
	}, "")
}

func (h *ReportHandler) GetMonthlyTrendsByYear(c *gin.Context) {
	data, err := h.queries.GetMonthlyTrendsByYear(c.Request.Context())
	if err != nil {
		response.InternalError(c, "Failed to fetch monthly trends by year")
		return
	}
	result := make([]MonthlyTrendsByYearPoint, len(data))
	for i, d := range data {
		result[i] = MonthlyTrendsByYearPoint{Year: d.Year, Month: d.Month, Checkouts: d.Checkouts, Returns: d.Returns}
	}
	response.Success(c, result, "")
}
