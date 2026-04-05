package handlers

import (
	"bytes"
	"encoding/csv"
	"errors"
	"fmt"
	"io"
	"net/http"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/holyredeemer/library-api/internal/middleware"
	"github.com/holyredeemer/library-api/internal/repositories/sqlcdb"
	"github.com/holyredeemer/library-api/internal/utils"
	"github.com/holyredeemer/library-api/pkg/response"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
)

type SchoolYearHandler struct {
	queries *sqlcdb.Queries
	db      *pgxpool.Pool
}

func NewSchoolYearHandler(queries *sqlcdb.Queries, db *pgxpool.Pool) *SchoolYearHandler {
	return &SchoolYearHandler{queries: queries, db: db}
}

type SchoolYearRangeRequest struct {
	StartDate string `json:"start_date"`
	EndDate   string `json:"end_date"`
}

type SchoolYearArchiveRequest struct {
	StartDate            string `json:"start_date"`
	EndDate              string `json:"end_date"`
	IncludeAuditLogs     bool   `json:"include_audit_logs"`
	IncludeNotifications bool   `json:"include_notifications"`
}

type ArchiveGraduatesRequest struct {
	StudentIDs []string `json:"student_ids" binding:"required"`
}

type ImportStudentsResult struct {
	Total    int `json:"total"`
	Imported int `json:"imported"`
	Skipped  int `json:"skipped"`
}

type ImportStudentsError struct {
	Row     int               `json:"row"`
	Message string            `json:"message"`
	Data    map[string]string `json:"data"`
}

type ImportStudentsResponse struct {
	Result ImportStudentsResult  `json:"result"`
	Errors []ImportStudentsError `json:"errors"`
}

type ResetStudentDataResponse struct {
	Transactions  int64 `json:"transactions"`
	Fines         int64 `json:"fines"`
	Payments      int64 `json:"payments"`
	Requests      int64 `json:"requests"`
	Notifications int64 `json:"notifications"`
	AuditLogs     int64 `json:"auditLogs"`
	Favorites     int64 `json:"favorites"`
	Achievements  int64 `json:"achievements"`
}

type YearEndSummaryResponse struct {
	TotalTransactions int64   `json:"totalTransactions"`
	ReturnedCount     int64   `json:"returnedCount"`
	OverdueCount      int64   `json:"overdueCount"`
	LostCount         int64   `json:"lostCount"`
	ActiveLoans       int64   `json:"activeLoans"`
	PendingFines      float64 `json:"pendingFines"`
	PaidFines         float64 `json:"paidFines"`
	WaivedFines       float64 `json:"waivedFines"`
	PendingRequests   int64   `json:"pendingRequests"`
	ApprovedRequests  int64   `json:"approvedRequests"`
	RejectedRequests  int64   `json:"rejectedRequests"`
	FulfilledRequests int64   `json:"fulfilledRequests"`
	ActiveStudents    int64   `json:"activeStudents"`
	GraduatedStudents int64   `json:"graduatedStudents"`
}

type UpdatePoliciesRequest struct {
	SchoolYear string            `json:"school_year"`
	Settings   map[string]string `json:"settings"`
}

func (h *SchoolYearHandler) ExportArchive(c *gin.Context) {
	var req SchoolYearArchiveRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request body")
		return
	}

	startDate, endDate, err := parseDateRange(req.StartDate, req.EndDate)
	if err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	buf := &bytes.Buffer{}
	writer := csv.NewWriter(buf)

	if err := writeCSVSection(writer, "transactions"); err != nil {
		response.InternalError(c, "Failed to prepare export")
		return
	}
	if err := h.writeTransactionsCSV(c, writer, startDate, endDate); err != nil {
		response.InternalError(c, "Failed to export transactions")
		return
	}

	if err := writeCSVSection(writer, "fines"); err != nil {
		response.InternalError(c, "Failed to prepare export")
		return
	}
	if err := h.writeFinesCSV(c, writer, startDate, endDate); err != nil {
		response.InternalError(c, "Failed to export fines")
		return
	}

	if err := writeCSVSection(writer, "payments"); err != nil {
		response.InternalError(c, "Failed to prepare export")
		return
	}
	if err := h.writePaymentsCSV(c, writer, startDate, endDate); err != nil {
		response.InternalError(c, "Failed to export payments")
		return
	}

	if err := writeCSVSection(writer, "requests"); err != nil {
		response.InternalError(c, "Failed to prepare export")
		return
	}
	if err := h.writeRequestsCSV(c, writer, startDate, endDate); err != nil {
		response.InternalError(c, "Failed to export requests")
		return
	}

	if req.IncludeNotifications {
		if err := writeCSVSection(writer, "notifications"); err != nil {
			response.InternalError(c, "Failed to prepare export")
			return
		}
		if err := h.writeNotificationsCSV(c, writer, startDate, endDate); err != nil {
			response.InternalError(c, "Failed to export notifications")
			return
		}
	}

	if req.IncludeAuditLogs {
		if err := writeCSVSection(writer, "audit_logs"); err != nil {
			response.InternalError(c, "Failed to prepare export")
			return
		}
		if err := h.writeAuditLogsCSV(c, writer, startDate, endDate); err != nil {
			response.InternalError(c, "Failed to export audit logs")
			return
		}
	}

	writer.Flush()
	if err := writer.Error(); err != nil {
		response.InternalError(c, "Failed to finalize export")
		return
	}

	filename := fmt.Sprintf("holyredeemer_archive_%s_to_%s.csv", formatDateForFile(startDate), formatDateForFile(endDate))
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", filename))
	c.Data(http.StatusOK, "text/csv", buf.Bytes())
}

func (h *SchoolYearHandler) ArchiveGraduates(c *gin.Context) {
	var req ArchiveGraduatesRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request body")
		return
	}

	if len(req.StudentIDs) == 0 {
		response.BadRequest(c, "No students provided")
		return
	}

	studentUUIDs := make([]uuid.UUID, 0, len(req.StudentIDs))
	for _, id := range req.StudentIDs {
		parsed, err := uuid.Parse(id)
		if err != nil {
			response.BadRequest(c, "Invalid student ID")
			return
		}
		studentUUIDs = append(studentUUIDs, parsed)
	}

	activeLoans, err := h.queries.CountActiveLoansByStudentIDs(c.Request.Context(), studentUUIDs)
	if err != nil {
		response.InternalError(c, "Failed to validate loans")
		return
	}
	if activeLoans > 0 {
		response.BadRequest(c, "Cannot archive students while there are active loans")
		return
	}

	if err := h.queries.UpdateStudentsStatusByIDs(c.Request.Context(), sqlcdb.UpdateStudentsStatusByIDsParams{
		Column1: studentUUIDs,
		Status:  sqlcdb.NullStudentStatus{StudentStatus: sqlcdb.StudentStatusGraduated, Valid: true},
	}); err != nil {
		response.InternalError(c, "Failed to update student status")
		return
	}

	if err := h.queries.UpdateUsersStatusByStudentIDs(c.Request.Context(), sqlcdb.UpdateUsersStatusByStudentIDsParams{
		Column1: studentUUIDs,
		Status:  sqlcdb.NullUserStatus{UserStatus: sqlcdb.UserStatusInactive, Valid: true},
	}); err != nil {
		response.InternalError(c, "Failed to update user status")
		return
	}

	if err := h.queries.DeleteRefreshTokensByStudentIDs(c.Request.Context(), studentUUIDs); err != nil {
		response.InternalError(c, "Failed to revoke sessions")
		return
	}

	response.Success(c, gin.H{"updated": len(studentUUIDs)}, "Students archived successfully")
}

func (h *SchoolYearHandler) ImportStudents(c *gin.Context) {
	file, err := c.FormFile("file")
	if err != nil {
		response.BadRequest(c, "File is required")
		return
	}

	if !isCSVFile(file.Filename) {
		response.BadRequest(c, "Only CSV files are supported")
		return
	}

	uploaded, err := file.Open()
	if err != nil {
		response.InternalError(c, "Failed to open uploaded file")
		return
	}
	defer uploaded.Close()

	reader := csv.NewReader(uploaded)
	reader.TrimLeadingSpace = true

	headers, err := reader.Read()
	if err != nil {
		response.BadRequest(c, "CSV header row missing")
		return
	}

	result := ImportStudentsResponse{
		Result: ImportStudentsResult{},
		Errors: []ImportStudentsError{},
	}

	rowIndex := 1
	for {
		rowIndex++
		record, err := reader.Read()
		if errors.Is(err, io.EOF) {
			break
		}
		if err != nil {
			result.Errors = append(result.Errors, ImportStudentsError{Row: rowIndex, Message: "Failed to read row"})
			result.Result.Skipped++
			continue
		}

		row := mapRow(headers, record)
		result.Result.Total++

		student, parseErr := parseStudentImportRow(row)
		if parseErr != nil {
			result.Errors = append(result.Errors, ImportStudentsError{Row: rowIndex, Message: parseErr.Error(), Data: row})
			result.Result.Skipped++
			continue
		}

		if err := h.createStudentFromImport(c, student); err != nil {
			result.Errors = append(result.Errors, ImportStudentsError{Row: rowIndex, Message: err.Error(), Data: row})
			result.Result.Skipped++
			continue
		}

		result.Result.Imported++
	}

	response.Success(c, result, "Student import complete")
}

func (h *SchoolYearHandler) YearEndReports(c *gin.Context) {
	startDate, endDate, err := parseDateRange(c.Query("start_date"), c.Query("end_date"))
	if err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	summary, err := h.queries.GetYearEndSummary(c.Request.Context(), sqlcdb.GetYearEndSummaryParams{
		StartDate: startDate,
		EndDate:   endDate,
	})
	if err != nil {
		response.InternalError(c, "Failed to generate year-end summary")
		return
	}

	resp := YearEndSummaryResponse{
		TotalTransactions: summary.TotalTransactions,
		ReturnedCount:     summary.ReturnedCount,
		OverdueCount:      summary.OverdueCount,
		LostCount:         summary.LostCount,
		ActiveLoans:       summary.ActiveLoans,
		PendingFines:      summary.PendingFines,
		PaidFines:         summary.PaidFines,
		WaivedFines:       summary.WaivedFines,
		PendingRequests:   summary.PendingRequests,
		ApprovedRequests:  summary.ApprovedRequests,
		RejectedRequests:  summary.RejectedRequests,
		FulfilledRequests: summary.FulfilledRequests,
		ActiveStudents:    summary.ActiveStudents,
		GraduatedStudents: summary.GraduatedStudents,
	}

	response.Success(c, resp, "Year-end reports generated")
}

func (h *SchoolYearHandler) ResetStudentData(c *gin.Context) {
	var req SchoolYearRangeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request body")
		return
	}

	startDate, endDate, err := parseDateRange(req.StartDate, req.EndDate)
	if err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	counts, err := h.queries.GetResetCounts(c.Request.Context(), sqlcdb.GetResetCountsParams{
		StartDate: startDate,
		EndDate:   endDate,
	})
	if err != nil {
		response.InternalError(c, "Failed to calculate reset counts")
		return
	}

	tx, err := h.db.Begin(c.Request.Context())
	if err != nil {
		response.InternalError(c, "Failed to begin transaction")
		return
	}
	defer func() { _ = tx.Rollback(c.Request.Context()) }()

	queries := h.queries.WithTx(tx)

	if err := queries.DeletePaymentsByDateRange(c.Request.Context(), sqlcdb.DeletePaymentsByDateRangeParams{
		StartDate: startDate,
		EndDate:   endDate,
	}); err != nil {
		response.InternalError(c, "Failed to reset payments")
		return
	}

	if err := queries.DeleteFinesByDateRange(c.Request.Context(), sqlcdb.DeleteFinesByDateRangeParams{
		StartDate: startDate,
		EndDate:   endDate,
	}); err != nil {
		response.InternalError(c, "Failed to reset fines")
		return
	}

	if err := queries.DeleteTransactionsByDateRange(c.Request.Context(), sqlcdb.DeleteTransactionsByDateRangeParams{
		StartDate: startDate,
		EndDate:   endDate,
	}); err != nil {
		response.InternalError(c, "Failed to reset transactions")
		return
	}

	if err := queries.DeleteRequestsByDateRange(c.Request.Context(), sqlcdb.DeleteRequestsByDateRangeParams{
		StartDate: startDate,
		EndDate:   endDate,
	}); err != nil {
		response.InternalError(c, "Failed to reset requests")
		return
	}

	if err := queries.DeleteNotificationsByDateRange(c.Request.Context(), sqlcdb.DeleteNotificationsByDateRangeParams{
		StartDate: startDate,
		EndDate:   endDate,
	}); err != nil {
		response.InternalError(c, "Failed to reset notifications")
		return
	}

	if err := queries.DeleteAuditLogsByDateRange(c.Request.Context(), sqlcdb.DeleteAuditLogsByDateRangeParams{
		StartDate: startDate,
		EndDate:   endDate,
	}); err != nil {
		response.InternalError(c, "Failed to reset audit logs")
		return
	}

	if err := queries.DeleteFavorites(c.Request.Context()); err != nil {
		response.InternalError(c, "Failed to reset favorites")
		return
	}

	if err := queries.DeleteStudentAchievements(c.Request.Context()); err != nil {
		response.InternalError(c, "Failed to reset achievements")
		return
	}

	if err := tx.Commit(c.Request.Context()); err != nil {
		response.InternalError(c, "Failed to reset student data")
		return
	}

	resp := ResetStudentDataResponse{
		Transactions:  counts.TransactionsCount,
		Fines:         counts.FinesCount,
		Payments:      counts.PaymentsCount,
		Requests:      counts.RequestsCount,
		Notifications: counts.NotificationsCount,
		AuditLogs:     counts.AuditLogsCount,
		Favorites:     counts.FavoritesCount,
		Achievements:  counts.AchievementsCount,
	}

	response.Success(c, resp, "Student data reset successfully")
}

func (h *SchoolYearHandler) UpdatePolicies(c *gin.Context) {
	var req UpdatePoliciesRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request body")
		return
	}

	if strings.TrimSpace(req.SchoolYear) == "" && len(req.Settings) == 0 {
		response.BadRequest(c, "No settings provided")
		return
	}

	authUser := getAuthUser(c)
	if authUser == nil {
		response.Unauthorized(c, "User not authenticated")
		return
	}
	userID, _ := uuid.Parse(authUser.ID)

	if strings.TrimSpace(req.SchoolYear) != "" {
		_, err := h.queries.CreateSetting(c.Request.Context(), sqlcdb.CreateSettingParams{
			Key:         toPgText("school_year"),
			Value:       toPgText(strings.TrimSpace(req.SchoolYear)),
			Description: toPgText("Current school year"),
			Category:    toPgText("general"),
			UpdatedBy:   toPgUUID(userID),
		})
		if err != nil {
			response.InternalError(c, "Failed to update school year")
			return
		}
	}

	for key, value := range req.Settings {
		if strings.TrimSpace(key) == "" {
			continue
		}
		if err := h.queries.UpdateSetting(c.Request.Context(), sqlcdb.UpdateSettingParams{
			Key:       toPgText(strings.TrimSpace(key)),
			Value:     toPgText(strings.TrimSpace(value)),
			UpdatedBy: toPgUUID(userID),
		}); err != nil {
			response.InternalError(c, "Failed to update settings")
			return
		}
	}

	response.Success(c, nil, "Policies updated successfully")
}

func (h *SchoolYearHandler) ExportStudents(c *gin.Context) {
	students, err := h.queries.ExportStudents(c.Request.Context())
	if err != nil {
		response.InternalError(c, "Failed to export students")
		return
	}

	buf := &bytes.Buffer{}
	writer := csv.NewWriter(buf)
	if err := writer.Write([]string{"student_id", "username", "name", "email", "grade_level", "section", "rfid_code", "contact_info", "guardian_name", "guardian_contact", "status", "registration_date"}); err != nil {
		response.InternalError(c, "Failed to export students")
		return
	}

	for _, s := range students {
		row := []string{
			s.StudentID,
			s.Username,
			s.StudentName,
			fromPgText(s.Email),
			strconv.Itoa(int(s.GradeLevel)),
			s.Section,
			fromPgText(s.RfidCode),
			fromPgText(s.ContactInfo),
			fromPgText(s.GuardianName),
			fromPgText(s.GuardianContact),
			formatStudentStatusValue(s.Status),
			formatPgDate(s.RegistrationDate, "2006-01-02"),
		}
		if err := writer.Write(row); err != nil {
			response.InternalError(c, "Failed to export students")
			return
		}
	}

	writer.Flush()
	if err := writer.Error(); err != nil {
		response.InternalError(c, "Failed to export students")
		return
	}

	filename := fmt.Sprintf("holyredeemer_students_%s.csv", time.Now().Format("2006-01-02"))
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", filename))
	c.Data(http.StatusOK, "text/csv", buf.Bytes())
}

func (h *SchoolYearHandler) writeTransactionsCSV(c *gin.Context, writer *csv.Writer, startDate, endDate pgtype.Date) error {
	rows, err := h.queries.ExportTransactions(c.Request.Context(), sqlcdb.ExportTransactionsParams{
		StartDate: startDate,
		EndDate:   endDate,
	})
	if err != nil {
		return err
	}
	if err := writer.Write([]string{"transaction_id", "student_id", "student_name", "book_title", "copy_number", "status", "checkout_date", "due_date", "return_date", "renewal_count", "notes"}); err != nil {
		return err
	}
	for _, row := range rows {
		if err := writer.Write([]string{
			row.ID.String(),
			row.StudentID,
			row.StudentName,
			row.BookTitle,
			strconv.Itoa(int(row.CopyNumber)),
			formatTransactionStatusValue(row.Status),
			formatPgTimestampValue(row.CheckoutDate),
			formatPgDate(row.DueDate, "2006-01-02"),
			formatPgTimestampValue(row.ReturnDate),
			formatInt4Value(row.RenewalCount),
			fromPgText(row.Notes),
		}); err != nil {
			return err
		}
	}
	return nil
}

func (h *SchoolYearHandler) writeFinesCSV(c *gin.Context, writer *csv.Writer, startDate, endDate pgtype.Date) error {
	rows, err := h.queries.ExportFines(c.Request.Context(), sqlcdb.ExportFinesParams{
		StartDate: startDate,
		EndDate:   endDate,
	})
	if err != nil {
		return err
	}
	if err := writer.Write([]string{"fine_id", "student_id", "student_name", "amount", "fine_type", "description", "status", "created_at", "updated_at"}); err != nil {
		return err
	}
	for _, row := range rows {
		if err := writer.Write([]string{
			row.ID.String(),
			row.StudentID,
			row.StudentName,
			fmt.Sprintf("%.2f", fromPgNumeric(row.Amount)),
			string(row.FineType),
			fromPgText(row.Description),
			formatFineStatus(row.Status),
			formatPgTimestampValue(row.CreatedAt),
			formatPgTimestampValue(row.UpdatedAt),
		}); err != nil {
			return err
		}
	}
	return nil
}

func (h *SchoolYearHandler) writePaymentsCSV(c *gin.Context, writer *csv.Writer, startDate, endDate pgtype.Date) error {
	rows, err := h.queries.ExportPayments(c.Request.Context(), sqlcdb.ExportPaymentsParams{
		StartDate: startDate,
		EndDate:   endDate,
	})
	if err != nil {
		return err
	}
	if err := writer.Write([]string{"payment_id", "student_id", "student_name", "amount", "payment_method", "reference_number", "notes", "payment_date", "created_at"}); err != nil {
		return err
	}
	for _, row := range rows {
		if err := writer.Write([]string{
			row.ID.String(),
			row.StudentID,
			row.StudentName,
			fmt.Sprintf("%.2f", fromPgNumeric(row.Amount)),
			string(row.PaymentMethod),
			fromPgText(row.ReferenceNumber),
			fromPgText(row.Notes),
			formatPgTimestampValue(row.PaymentDate),
			formatPgTimestampValue(row.CreatedAt),
		}); err != nil {
			return err
		}
	}
	return nil
}

func (h *SchoolYearHandler) writeRequestsCSV(c *gin.Context, writer *csv.Writer, startDate, endDate pgtype.Date) error {
	rows, err := h.queries.ExportRequests(c.Request.Context(), sqlcdb.ExportRequestsParams{
		StartDate: startDate,
		EndDate:   endDate,
	})
	if err != nil {
		return err
	}
	if err := writer.Write([]string{"request_id", "student_id", "student_name", "book_title", "request_type", "status", "request_date", "processed_at", "notes"}); err != nil {
		return err
	}
	for _, row := range rows {
		if err := writer.Write([]string{
			row.ID.String(),
			row.StudentID,
			row.StudentName,
			row.BookTitle,
			string(row.RequestType),
			formatRequestStatus(row.Status),
			formatPgTimestampValue(row.RequestDate),
			formatPgTimestampValue(row.ProcessedAt),
			fromPgText(row.Notes),
		}); err != nil {
			return err
		}
	}
	return nil
}

func (h *SchoolYearHandler) writeNotificationsCSV(c *gin.Context, writer *csv.Writer, startDate, endDate pgtype.Date) error {
	rows, err := h.queries.ExportNotifications(c.Request.Context(), sqlcdb.ExportNotificationsParams{
		StartDate: startDate,
		EndDate:   endDate,
	})
	if err != nil {
		return err
	}
	if err := writer.Write([]string{"notification_id", "username", "user_name", "type", "title", "message", "is_read", "reference_type", "reference_id", "created_at"}); err != nil {
		return err
	}
	for _, row := range rows {
		if err := writer.Write([]string{
			row.ID.String(),
			row.Username,
			row.UserName,
			string(row.Type),
			row.Title,
			row.Message,
			strconv.FormatBool(row.IsRead.Bool),
			fromPgText(row.ReferenceType),
			uuidOrEmpty(row.ReferenceID),
			formatPgTimestampValue(row.CreatedAt),
		}); err != nil {
			return err
		}
	}
	return nil
}

func (h *SchoolYearHandler) writeAuditLogsCSV(c *gin.Context, writer *csv.Writer, startDate, endDate pgtype.Date) error {
	rows, err := h.queries.ExportAuditLogs(c.Request.Context(), sqlcdb.ExportAuditLogsParams{
		StartDate: startDate,
		EndDate:   endDate,
	})
	if err != nil {
		return err
	}
	if err := writer.Write([]string{"audit_id", "username", "user_name", "action", "entity_type", "entity_id", "old_values", "new_values", "ip_address", "user_agent", "created_at"}); err != nil {
		return err
	}
	for _, row := range rows {
		if err := writer.Write([]string{
			row.ID.String(),
			fromPgText(row.Username),
			fromPgText(row.UserName),
			string(row.Action),
			fromPgText(row.EntityType),
			uuidOrEmpty(row.EntityID),
			formatJSONBytes(row.OldValues),
			formatJSONBytes(row.NewValues),
			fromPgText(row.IpAddress),
			fromPgText(row.UserAgent),
			formatPgTimestampValue(row.CreatedAt),
		}); err != nil {
			return err
		}
	}
	return nil
}

type studentImportPayload struct {
	Username        string
	Password        string
	StudentID       string
	Name            string
	Email           string
	GradeLevel      int32
	Section         string
	RFIDCode        string
	ContactInfo     string
	GuardianName    string
	GuardianContact string
}

func (h *SchoolYearHandler) createStudentFromImport(c *gin.Context, payload studentImportPayload) error {
	if payload.Username == "" || payload.StudentID == "" || payload.Name == "" || payload.Section == "" || payload.GradeLevel == 0 {
		return errors.New("Missing required fields")
	}

	if payload.Password == "" {
		payload.Password = "student123"
	}

	passwordHash, err := utils.HashPassword(payload.Password)
	if err != nil {
		return errors.New("Failed to hash password")
	}

	tx, err := h.db.Begin(c.Request.Context())
	if err != nil {
		return errors.New("Failed to begin transaction")
	}
	defer func() { _ = tx.Rollback(c.Request.Context()) }()

	queries := h.queries.WithTx(tx)

	user, err := queries.CreateUser(c.Request.Context(), sqlcdb.CreateUserParams{
		Username:     payload.Username,
		PasswordHash: passwordHash,
		Role:         sqlcdb.UserRoleStudent,
		Email:        toPgText(payload.Email),
		Name:         payload.Name,
		Status:       sqlcdb.NullUserStatus{UserStatus: sqlcdb.UserStatusActive, Valid: true},
	})
	if err != nil {
		return errors.New("Username already exists")
	}

	_, err = queries.CreateStudent(c.Request.Context(), sqlcdb.CreateStudentParams{
		UserID:          toPgUUID(user.ID),
		StudentID:       payload.StudentID,
		GradeLevel:      payload.GradeLevel,
		Section:         payload.Section,
		RfidCode:        toPgText(payload.RFIDCode),
		ContactInfo:     toPgText(payload.ContactInfo),
		GuardianName:    toPgText(payload.GuardianName),
		GuardianContact: toPgText(payload.GuardianContact),
		Status:          sqlcdb.NullStudentStatus{StudentStatus: sqlcdb.StudentStatusActive, Valid: true},
	})
	if err != nil {
		return errors.New("Failed to create student")
	}

	if err := tx.Commit(c.Request.Context()); err != nil {
		return errors.New("Failed to create student")
	}

	return nil
}

func parseDateRange(start, end string) (pgtype.Date, pgtype.Date, error) {
	startDate := pgtype.Date{Valid: false}
	endDate := pgtype.Date{Valid: false}

	if strings.TrimSpace(start) != "" {
		parsed, err := time.Parse("2006-01-02", start)
		if err != nil {
			return startDate, endDate, errors.New("Invalid start_date format")
		}
		startDate = pgtype.Date{Time: parsed, Valid: true}
	}

	if strings.TrimSpace(end) != "" {
		parsed, err := time.Parse("2006-01-02", end)
		if err != nil {
			return startDate, endDate, errors.New("Invalid end_date format")
		}
		endDate = pgtype.Date{Time: parsed, Valid: true}
	}

	if startDate.Valid && endDate.Valid && startDate.Time.After(endDate.Time) {
		return startDate, endDate, errors.New("start_date must be before end_date")
	}

	return startDate, endDate, nil
}

func writeCSVSection(writer *csv.Writer, section string) error {
	return writer.Write([]string{fmt.Sprintf("-- %s --", section)})
}

func mapRow(headers []string, record []string) map[string]string {
	row := make(map[string]string)
	for idx, header := range headers {
		if idx < len(record) {
			row[header] = strings.TrimSpace(record[idx])
		}
	}
	return row
}

func parseStudentImportRow(row map[string]string) (studentImportPayload, error) {
	get := func(keys ...string) string {
		for _, key := range keys {
			if val, ok := row[key]; ok {
				return strings.TrimSpace(val)
			}
		}
		return ""
	}

	studentID := get("student_id", "student id", "studentid")
	firstName := get("first_name", "first name", "firstname")
	lastName := get("last_name", "last name", "lastname")
	fullName := strings.TrimSpace(strings.Join([]string{firstName, lastName}, " "))
	if fullName == "" {
		fullName = get("name", "full_name", "full name")
	}
	grade := get("grade_level", "grade level", "grade")
	section := get("section")

	if studentID == "" || fullName == "" || grade == "" || section == "" {
		return studentImportPayload{}, errors.New("Missing required fields")
	}

	gradeLevel, err := parseGradeLevel(grade)
	if err != nil {
		return studentImportPayload{}, err
	}

	username := get("username")
	if username == "" {
		username = strings.ToLower(strings.ReplaceAll(studentID, " ", ""))
	}

	password := get("password")
	if password == "" {
		password = "student123"
	}

	email := get("email")
	if email == "" {
		email = fmt.Sprintf("%s@school.local", username)
	}

	return studentImportPayload{
		Username:        username,
		Password:        password,
		StudentID:       studentID,
		Name:            fullName,
		Email:           email,
		GradeLevel:      gradeLevel,
		Section:         section,
		RFIDCode:        get("rfid", "rfid_code", "rfid code"),
		ContactInfo:     get("contact_info", "contact", "contact number"),
		GuardianName:    get("guardian_name", "guardian"),
		GuardianContact: get("guardian_contact", "guardian contact"),
	}, nil
}

func parseGradeLevel(raw string) (int32, error) {
	trimmed := strings.TrimSpace(strings.ToLower(raw))
	trimmed = strings.ReplaceAll(trimmed, "grade", "")
	trimmed = strings.TrimSpace(trimmed)
	value, err := strconv.Atoi(trimmed)
	if err != nil {
		return 0, errors.New("Invalid grade level")
	}
	if value < 1 || value > 12 {
		return 0, errors.New("Grade level must be between 1 and 12")
	}
	return int32(value), nil
}

func formatDateForFile(date pgtype.Date) string {
	if !date.Valid {
		return "all"
	}
	return date.Time.Format("2006-01-02")
}

func uuidOrEmpty(value pgtype.UUID) string {
	if value.Valid {
		return uuid.UUID(value.Bytes).String()
	}
	return ""
}

func formatPgTimestampValue(value pgtype.Timestamp) string {
	if value.Valid {
		return value.Time.Format(time.RFC3339)
	}
	return ""
}

func isCSVFile(name string) bool {
	return strings.EqualFold(filepath.Ext(name), ".csv")
}

func getAuthUser(c *gin.Context) *middleware.AuthUser {
	return middleware.GetAuthUser(c)
}

func formatJSONBytes(value []byte) string {
	if len(value) == 0 {
		return ""
	}
	return string(value)
}

func formatFineStatus(status sqlcdb.NullFineStatus) string {
	if status.Valid {
		return string(status.FineStatus)
	}
	return ""
}

func formatRequestStatus(status sqlcdb.NullRequestStatus) string {
	if status.Valid {
		return string(status.RequestStatus)
	}
	return ""
}

func formatStudentStatusValue(status sqlcdb.NullStudentStatus) string {
	if status.Valid {
		return string(status.StudentStatus)
	}
	return ""
}

func formatTransactionStatusValue(status sqlcdb.NullTransactionStatus) string {
	if status.Valid {
		return string(status.TransactionStatus)
	}
	return ""
}

func formatInt4Value(value pgtype.Int4) string {
	if value.Valid {
		return strconv.Itoa(int(value.Int32))
	}
	return ""
}
