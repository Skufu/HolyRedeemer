package handlers

import (
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/holyredeemer/library-api/internal/config"
	"github.com/holyredeemer/library-api/internal/middleware"
	"github.com/holyredeemer/library-api/internal/repositories/sqlcdb"
	"github.com/holyredeemer/library-api/internal/utils"
	"github.com/holyredeemer/library-api/pkg/response"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/sync/errgroup"
)

type StudentHandler struct {
	queries *sqlcdb.Queries
	db      *pgxpool.Pool
	config  *config.Config
}

func NewStudentHandler(queries *sqlcdb.Queries, db *pgxpool.Pool, cfg *config.Config) *StudentHandler {
	return &StudentHandler{queries: queries, db: db, config: cfg}
}

// StudentResponse represents a student in API responses (matches frontend types.ts)
type StudentResponse struct {
	ID              string    `json:"id"`
	Username        string    `json:"username"`
	Name            string    `json:"name"`
	Email           string    `json:"email"`
	Role            string    `json:"role"`
	StudentID       string    `json:"studentId"`
	GradeLevel      int32     `json:"gradeLevel"`
	Section         string    `json:"section"`
	RFID            string    `json:"rfid,omitempty"`
	GuardianName    string    `json:"guardianName,omitempty"`
	GuardianContact string    `json:"guardianContact,omitempty"`
	Status          string    `json:"status"`
	CurrentLoans    int64     `json:"currentLoans"`
	TotalFines      float64   `json:"totalFines"`
	CreatedAt       time.Time `json:"createdAt"`
}

type StudentDashboardResponse struct {
	Profile     StudentResponse       `json:"profile"`
	Loans       []TransactionResponse `json:"loans"`
	Fines       []FineResponse        `json:"fines"`
	History     []TransactionResponse `json:"history"`
	UnreadCount int64                 `json:"unreadCount"`
}

// ListStudents returns paginated list of students
func (h *StudentHandler) ListStudents(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	perPage, _ := strconv.Atoi(c.DefaultQuery("per_page", "20"))
	if perPage > 100 {
		perPage = 100
	}
	offset := (page - 1) * perPage

	search := c.Query("search")
	gradeLevel, _ := strconv.Atoi(c.Query("grade_level"))
	section := c.Query("section")
	status := c.Query("status")

	students, err := h.queries.ListStudents(c.Request.Context(), sqlcdb.ListStudentsParams{
		Limit:      int32(perPage),
		Offset:     int32(offset),
		Search:     toPgText(search),
		GradeLevel: toPgInt4(int32(gradeLevel)),
		Section:    toPgText(section),
		Status:     toPgStudentStatus(status),
	})
	if err != nil {
		response.InternalError(c, "Failed to fetch students")
		return
	}

	total, err := h.queries.CountStudents(c.Request.Context(), sqlcdb.CountStudentsParams{
		Search:     toPgText(search),
		GradeLevel: toPgInt4(int32(gradeLevel)),
		Section:    toPgText(section),
		Status:     toPgStudentStatus(status),
	})
	if err != nil {
		response.InternalError(c, "Failed to count students")
		return
	}

	studentResponses := make([]StudentResponse, len(students))
	for i, s := range students {
		// Handle TotalFines which is interface{} type
		var totalFines float64
		if s.TotalFines != nil {
			if f, ok := s.TotalFines.(float64); ok {
				totalFines = f
			}
		}

		studentResponses[i] = StudentResponse{
			ID:              s.ID.String(),
			Username:        s.Username,
			Name:            s.UserName,
			Email:           fromPgText(s.UserEmail),
			Role:            "student",
			StudentID:       s.StudentID,
			GradeLevel:      s.GradeLevel,
			Section:         s.Section,
			RFID:            fromPgText(s.RfidCode),
			GuardianName:    fromPgText(s.GuardianName),
			GuardianContact: fromPgText(s.GuardianContact),
			Status:          getStudentStatusFromNull(s.Status),
			CurrentLoans:    s.CurrentLoans,
			TotalFines:      totalFines,
			CreatedAt:       fromPgTimestamp(s.CreatedAt),
		}
	}

	totalPages := int(total) / perPage
	if int(total)%perPage > 0 {
		totalPages++
	}

	response.SuccessWithMeta(c, studentResponses, &response.Meta{
		Page:       page,
		PerPage:    perPage,
		Total:      total,
		TotalPages: totalPages,
	})
}

// GetStudent returns a single student by ID
func (h *StudentHandler) GetStudent(c *gin.Context) {
	studentID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "Invalid student ID")
		return
	}

	// Check authorization - students can only view their own profile
	authUser := middleware.GetAuthUser(c)
	if authUser.Role == "student" {
		// Get student's user ID to compare
		authStudent, lookupErr := h.queries.GetStudentByID(c.Request.Context(), studentID)
		if lookupErr != nil {
			response.NotFound(c, "Student not found")
			return
		}
		if fromPgUUID(authStudent.UserID).String() != authUser.ID {
			response.Forbidden(c, "Cannot view other student's profile")
			return
		}
	}

	student, err := h.queries.GetStudentByID(c.Request.Context(), studentID)
	if err != nil {
		response.NotFound(c, "Student not found")
		return
	}

	var loans int64
	var fines float64

	g, ctx := errgroup.WithContext(c.Request.Context())

	g.Go(func() error {
		var err error
		loans, err = h.queries.GetStudentCurrentLoans(ctx, toPgUUID(student.ID))
		return err
	})

	g.Go(func() error {
		var err error
		fines, err = h.queries.GetStudentTotalFines(ctx, toPgUUID(student.ID))
		return err
	})

	if err := g.Wait(); err != nil {
		response.InternalError(c, "Failed to fetch student data")
		return
	}

	response.Success(c, StudentResponse{
		ID:              student.ID.String(),
		Username:        student.Username,
		Name:            student.UserName,
		Email:           fromPgText(student.UserEmail),
		Role:            "student",
		StudentID:       student.StudentID,
		GradeLevel:      student.GradeLevel,
		Section:         student.Section,
		RFID:            fromPgText(student.RfidCode),
		GuardianName:    fromPgText(student.GuardianName),
		GuardianContact: fromPgText(student.GuardianContact),
		Status:          getStudentStatusFromNull(student.Status),
		CurrentLoans:    loans,
		TotalFines:      fines,
		CreatedAt:       fromPgTimestamp(student.CreatedAt),
	}, "")
}

// GetMe returns the current student's profile
func (h *StudentHandler) GetMe(c *gin.Context) {
	authUser := middleware.GetAuthUser(c)

	userID, err := uuid.Parse(authUser.ID)
	if err != nil {
		response.InternalError(c, "Invalid user ID")
		return
	}

	student, err := h.queries.GetStudentByUserID(c.Request.Context(), toPgUUID(userID))
	if err != nil {
		response.NotFound(c, "Student profile not found")
		return
	}

	var loans int64
	var fines float64

	g, ctx := errgroup.WithContext(c.Request.Context())

	g.Go(func() error {
		var err error
		loans, err = h.queries.GetStudentCurrentLoans(ctx, toPgUUID(student.ID))
		return err
	})

	g.Go(func() error {
		var err error
		fines, err = h.queries.GetStudentTotalFines(ctx, toPgUUID(student.ID))
		return err
	})

	if err := g.Wait(); err != nil {
		response.InternalError(c, "Failed to fetch student data")
		return
	}

	response.Success(c, StudentResponse{
		ID:              student.ID.String(),
		Username:        student.Username,
		Name:            student.UserName,
		Email:           fromPgText(student.UserEmail),
		Role:            "student",
		StudentID:       student.StudentID,
		GradeLevel:      student.GradeLevel,
		Section:         student.Section,
		RFID:            fromPgText(student.RfidCode),
		GuardianName:    fromPgText(student.GuardianName),
		GuardianContact: fromPgText(student.GuardianContact),
		Status:          getStudentStatusFromNull(student.Status),
		CurrentLoans:    loans,
		TotalFines:      fines,
		CreatedAt:       fromPgTimestamp(student.CreatedAt),
	}, "")
}

func (h *StudentHandler) GetMyDashboard(c *gin.Context) {
	authUser := middleware.GetAuthUser(c)
	if authUser == nil {
		response.Unauthorized(c, "User not authenticated")
		return
	}

	userID, err := uuid.Parse(authUser.ID)
	if err != nil {
		response.InternalError(c, "Invalid user ID")
		return
	}

	student, err := h.queries.GetStudentByUserID(c.Request.Context(), toPgUUID(userID))
	if err != nil {
		response.NotFound(c, "Student profile not found")
		return
	}

	loansPerPage := 20
	if val := c.Query("loans_per_page"); val != "" {
		if parsed, parseErr := strconv.Atoi(val); parseErr == nil && parsed > 0 {
			loansPerPage = parsed
		}
	}
	if loansPerPage > 100 {
		loansPerPage = 100
	}

	finesPerPage := 20
	if val := c.Query("fines_per_page"); val != "" {
		if parsed, parseErr := strconv.Atoi(val); parseErr == nil && parsed > 0 {
			finesPerPage = parsed
		}
	}
	if finesPerPage > 100 {
		finesPerPage = 100
	}

	historyPerPage := 4
	if val := c.Query("history_per_page"); val != "" {
		if parsed, parseErr := strconv.Atoi(val); parseErr == nil && parsed > 0 {
			historyPerPage = parsed
		}
	}
	if historyPerPage > 100 {
		historyPerPage = 100
	}

	var loans []sqlcdb.ListActiveTransactionsRow
	var fines []sqlcdb.ListFinesByStudentRow
	var history []sqlcdb.ListTransactionsByStudentRow
	var unreadCount int64

	g, ctx := errgroup.WithContext(c.Request.Context())

	// Fetch loans
	g.Go(func() error {
		var err error
		loans, err = h.queries.ListActiveTransactions(ctx, sqlcdb.ListActiveTransactionsParams{
			Limit:     int32(loansPerPage),
			Offset:    0,
			StudentID: toPgUUID(student.ID),
		})
		return err
	})

	// Fetch fines
	g.Go(func() error {
		var err error
		fines, err = h.queries.ListFinesByStudent(ctx, sqlcdb.ListFinesByStudentParams{
			StudentID: toPgUUID(student.ID),
			Limit:     int32(finesPerPage),
			Offset:    0,
		})
		return err
	})

	// Fetch history
	g.Go(func() error {
		var err error
		history, err = h.queries.ListTransactionsByStudent(ctx, sqlcdb.ListTransactionsByStudentParams{
			StudentID: toPgUUID(student.ID),
			Limit:     int32(historyPerPage),
			Offset:    0,
		})
		return err
	})

	// Fetch unread count
	g.Go(func() error {
		var err error
		unreadCount, err = h.queries.GetUnreadCount(ctx, toPgUUID(userID))
		return err
	})

	if err := g.Wait(); err != nil {
		response.InternalError(c, "Failed to fetch dashboard data: "+err.Error())
		return
	}

	loanResponses := make([]TransactionResponse, len(loans))
	for i, t := range loans {
		loanResponses[i] = TransactionResponse{
			ID:           t.ID.String(),
			BookID:       t.BookID.String(),
			BookCopyID:   fromPgUUID(t.CopyID).String(),
			BookTitle:    t.BookTitle,
			BookAuthor:   t.BookAuthor,
			CopyNumber:   t.CopyNumber,
			QRCode:       t.QrCode,
			CheckoutDate: fromPgTimestamp(t.CheckoutDate),
			DueDate:      formatPgDate(t.DueDate, "2006-01-02"),
			Status:       getTransactionStatus(t.Status),
			RenewCount:   fromPgInt4(t.RenewalCount),
		}
	}

	currentLoans := int64(len(loanResponses))

	fineResponses := make([]FineResponse, len(fines))
	totalPendingFines := 0.0
	for i, f := range fines {
		status := getFineStatus(f.Status)
		amount := fromPgNumeric(f.Amount)
		if status == "pending" {
			totalPendingFines += amount
		}
		fineResponses[i] = FineResponse{
			ID:        f.ID.String(),
			StudentID: fromPgUUID(f.StudentID).String(),
			BookTitle: fromPgText(f.BookTitle),
			Amount:    amount,
			Reason:    fromPgText(f.Description),
			Status:    status,
			CreatedAt: fromPgTimestamp(f.CreatedAt),
		}
		if f.TransactionID.Valid {
			fineResponses[i].TransactionID = uuid.UUID(f.TransactionID.Bytes).String()
		}
	}

	historyResponses := make([]TransactionResponse, len(history))
	for i, t := range history {
		historyResponses[i] = TransactionResponse{
			ID:           t.ID.String(),
			BookID:       t.BookID.String(),
			BookCopyID:   fromPgUUID(t.CopyID).String(),
			BookTitle:    t.BookTitle,
			BookAuthor:   t.BookAuthor,
			CopyNumber:   t.CopyNumber,
			QRCode:       t.QrCode,
			CheckoutDate: fromPgTimestamp(t.CheckoutDate),
			DueDate:      formatPgDate(t.DueDate, "2006-01-02"),
			Status:       getTransactionStatus(t.Status),
			RenewCount:   fromPgInt4(t.RenewalCount),
		}
		if t.ReturnDate.Valid {
			historyResponses[i].ReturnDate = t.ReturnDate.Time.Format("2006-01-02")
		}
	}

	profile := StudentResponse{
		ID:              student.ID.String(),
		Username:        student.Username,
		Name:            student.UserName,
		Email:           fromPgText(student.UserEmail),
		Role:            "student",
		StudentID:       student.StudentID,
		GradeLevel:      student.GradeLevel,
		Section:         student.Section,
		RFID:            fromPgText(student.RfidCode),
		GuardianName:    fromPgText(student.GuardianName),
		GuardianContact: fromPgText(student.GuardianContact),
		Status:          getStudentStatusFromNull(student.Status),
		CurrentLoans:    currentLoans,
		TotalFines:      totalPendingFines,
		CreatedAt:       fromPgTimestamp(student.CreatedAt),
	}

	response.Success(c, StudentDashboardResponse{
		Profile:     profile,
		Loans:       loanResponses,
		Fines:       fineResponses,
		History:     historyResponses,
		UnreadCount: unreadCount,
	}, "")
}

// CreateStudentRequest represents the create student request
type CreateStudentRequest struct {
	Username        string `json:"username" binding:"required"`
	Password        string `json:"password" binding:"required"`
	StudentID       string `json:"student_id" binding:"required"`
	Name            string `json:"name" binding:"required"`
	Email           string `json:"email"`
	GradeLevel      int32  `json:"grade_level" binding:"required"`
	Section         string `json:"section" binding:"required"`
	RFIDCode        string `json:"rfid_code"`
	ContactInfo     string `json:"contact_info"`
	GuardianName    string `json:"guardian_name"`
	GuardianContact string `json:"guardian_contact"`
}

// CreateStudent creates a new student with user account
func (h *StudentHandler) CreateStudent(c *gin.Context) {
	var req CreateStudentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request body")
		return
	}

	// Hash password
	passwordHash, err := utils.HashPassword(req.Password)
	if err != nil {
		response.InternalError(c, "Failed to hash password")
		return
	}

	// Begin transaction for atomic user+student creation
	tx, err := h.db.Begin(c.Request.Context())
	if err != nil {
		response.InternalError(c, "Failed to begin transaction")
		return
	}
	defer func() { _ = tx.Rollback(c.Request.Context()) }()

	queries := h.queries.WithTx(tx)

	// Create user first
	user, err := queries.CreateUser(c.Request.Context(), sqlcdb.CreateUserParams{
		Username:     req.Username,
		PasswordHash: passwordHash,
		Role:         sqlcdb.UserRoleStudent,
		Email:        toPgText(req.Email),
		Name:         req.Name,
		Status:       sqlcdb.NullUserStatus{UserStatus: sqlcdb.UserStatusActive, Valid: true},
	})
	if err != nil {
		response.Conflict(c, "Username already exists")
		return
	}

	// Create student record
	student, err := queries.CreateStudent(c.Request.Context(), sqlcdb.CreateStudentParams{
		UserID:          toPgUUID(user.ID),
		StudentID:       req.StudentID,
		GradeLevel:      req.GradeLevel,
		Section:         req.Section,
		RfidCode:        toPgText(req.RFIDCode),
		ContactInfo:     toPgText(req.ContactInfo),
		GuardianName:    toPgText(req.GuardianName),
		GuardianContact: toPgText(req.GuardianContact),
		Status:          sqlcdb.NullStudentStatus{StudentStatus: sqlcdb.StudentStatusActive, Valid: true},
	})
	if err != nil {
		response.InternalError(c, "Failed to create student")
		return
	}

	if err := tx.Commit(c.Request.Context()); err != nil {
		response.InternalError(c, "Failed to create student")
		return
	}

	// Log audit entry
	LogAuditFromContext(c, h.queries, sqlcdb.AuditActionCreate, "student", student.ID, map[string]interface{}{
		"student_id": student.StudentID,
		"name":       req.Name,
	})

	response.Created(c, gin.H{
		"id":         student.ID.String(),
		"user_id":    user.ID.String(),
		"student_id": student.StudentID,
	}, "Student created successfully")
}

// UpdateStudentRequest represents the update student request
type UpdateStudentRequest struct {
	Name            string `json:"name"`
	Email           string `json:"email"`
	GradeLevel      int32  `json:"grade_level"`
	Section         string `json:"section"`
	RFIDCode        string `json:"rfid_code"`
	ContactInfo     string `json:"contact_info"`
	GuardianName    string `json:"guardian_name"`
	GuardianContact string `json:"guardian_contact"`
	Status          string `json:"status"`
}

// UpdateStudent updates an existing student
func (h *StudentHandler) UpdateStudent(c *gin.Context) {
	studentID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "Invalid student ID")
		return
	}

	var req UpdateStudentRequest
	if bindErr := c.ShouldBindJSON(&req); bindErr != nil {
		response.BadRequest(c, "Invalid request body")
		return
	}

	// Get existing student to update user record
	existing, err := h.queries.GetStudentByID(c.Request.Context(), studentID)
	if err != nil {
		response.NotFound(c, "Student not found")
		return
	}

	// Begin transaction for atomic user+student update
	tx, err := h.db.Begin(c.Request.Context())
	if err != nil {
		response.InternalError(c, "Failed to begin transaction")
		return
	}
	defer func() { _ = tx.Rollback(c.Request.Context()) }()

	queries := h.queries.WithTx(tx)

	// Update user record if name or email provided
	if req.Name != "" || req.Email != "" {
		_, err = queries.UpdateUser(c.Request.Context(), sqlcdb.UpdateUserParams{
			ID:    fromPgUUID(existing.UserID),
			Name:  toPgText(req.Name),
			Email: toPgText(req.Email),
		})
		if err != nil {
			response.InternalError(c, "Failed to update user")
			return
		}
	}

	// Update student record
	_, err = queries.UpdateStudent(c.Request.Context(), sqlcdb.UpdateStudentParams{
		ID:              studentID,
		GradeLevel:      toPgInt4(req.GradeLevel),
		Section:         toPgText(req.Section),
		RfidCode:        toPgText(req.RFIDCode),
		ContactInfo:     toPgText(req.ContactInfo),
		GuardianName:    toPgText(req.GuardianName),
		GuardianContact: toPgText(req.GuardianContact),
		Status:          toPgStudentStatus(req.Status),
	})
	if err != nil {
		response.InternalError(c, "Failed to update student")
		return
	}

	if err := tx.Commit(c.Request.Context()); err != nil {
		response.InternalError(c, "Failed to update student")
		return
	}

	response.Success(c, nil, "Student updated successfully")
}

// TransactionResponse represents a transaction in API responses
type TransactionResponse struct {
	ID           string    `json:"id"`
	BookID       string    `json:"bookId"`
	BookCopyID   string    `json:"bookCopyId"`
	BookTitle    string    `json:"bookTitle"`
	BookAuthor   string    `json:"bookAuthor"`
	CopyNumber   int32     `json:"copyNumber"`
	QRCode       string    `json:"qrCode"`
	CheckoutDate time.Time `json:"checkoutDate"`
	DueDate      string    `json:"dueDate"`
	ReturnDate   string    `json:"returnDate,omitempty"`
	Status       string    `json:"status"`
	RenewCount   int32     `json:"renewCount"`
	FineAmount   float64   `json:"fineAmount"`
}

// GetStudentLoans returns current loans for a student
func (h *StudentHandler) GetStudentLoans(c *gin.Context) {
	studentID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "Invalid student ID")
		return
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	perPage, _ := strconv.Atoi(c.DefaultQuery("per_page", "20"))
	if perPage > 100 {
		perPage = 100
	}
	offset := (page - 1) * perPage

	authUser := middleware.GetAuthUser(c)
	if authUser.Role == "student" {
		authStudent, lookupErr := h.queries.GetStudentByID(c.Request.Context(), studentID)
		if lookupErr != nil || fromPgUUID(authStudent.UserID).String() != authUser.ID {
			response.Forbidden(c, "Cannot view other student's loans")
			return
		}
	}

	transactions, err := h.queries.ListActiveTransactions(c.Request.Context(), sqlcdb.ListActiveTransactionsParams{
		Limit:     int32(perPage),
		Offset:    int32(offset),
		StudentID: toPgUUID(studentID),
	})
	if err != nil {
		response.InternalError(c, "Failed to fetch loans")
		return
	}

	total, _ := h.queries.CountActiveTransactionsByStudent(c.Request.Context(), toPgUUID(studentID))

	txnResponses := make([]TransactionResponse, len(transactions))
	for i, t := range transactions {
		txnResponses[i] = TransactionResponse{
			ID:           t.ID.String(),
			BookID:       t.BookID.String(),
			BookCopyID:   fromPgUUID(t.CopyID).String(),
			BookTitle:    t.BookTitle,
			BookAuthor:   t.BookAuthor,
			CopyNumber:   t.CopyNumber,
			QRCode:       t.QrCode,
			CheckoutDate: fromPgTimestamp(t.CheckoutDate),
			DueDate:      formatPgDate(t.DueDate, "2006-01-02"),
			Status:       getTransactionStatus(t.Status),
			RenewCount:   fromPgInt4(t.RenewalCount),
		}
	}

	totalPages := int(total) / perPage
	if int(total)%perPage > 0 {
		totalPages++
	}

	response.SuccessWithMeta(c, txnResponses, &response.Meta{
		Page:       page,
		PerPage:    perPage,
		Total:      total,
		TotalPages: totalPages,
	})
}

// GetStudentHistory returns borrowing history for a student
func (h *StudentHandler) GetStudentHistory(c *gin.Context) {
	studentID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "Invalid student ID")
		return
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	perPage, _ := strconv.Atoi(c.DefaultQuery("per_page", "20"))
	if perPage > 100 {
		perPage = 100
	}
	offset := (page - 1) * perPage

	authUser := middleware.GetAuthUser(c)
	if authUser.Role == "student" {
		authStudent, lookupErr := h.queries.GetStudentByID(c.Request.Context(), studentID)
		if lookupErr != nil || fromPgUUID(authStudent.UserID).String() != authUser.ID {
			response.Forbidden(c, "Cannot view other student's history")
			return
		}
	}

	transactions, err := h.queries.ListTransactionsByStudent(c.Request.Context(), sqlcdb.ListTransactionsByStudentParams{
		StudentID: toPgUUID(studentID),
		Limit:     int32(perPage),
		Offset:    int32(offset),
	})
	if err != nil {
		response.InternalError(c, "Failed to fetch history")
		return
	}

	total, _ := h.queries.CountTransactionsByStudent(c.Request.Context(), toPgUUID(studentID))

	txnResponses := make([]TransactionResponse, len(transactions))
	for i, t := range transactions {
		txnResponses[i] = TransactionResponse{
			ID:           t.ID.String(),
			BookID:       t.BookID.String(),
			BookCopyID:   fromPgUUID(t.CopyID).String(),
			BookTitle:    t.BookTitle,
			BookAuthor:   t.BookAuthor,
			CopyNumber:   t.CopyNumber,
			QRCode:       t.QrCode,
			CheckoutDate: fromPgTimestamp(t.CheckoutDate),
			DueDate:      formatPgDate(t.DueDate, "2006-01-02"),
			Status:       getTransactionStatus(t.Status),
			RenewCount:   fromPgInt4(t.RenewalCount),
		}
		if t.ReturnDate.Valid {
			txnResponses[i].ReturnDate = t.ReturnDate.Time.Format("2006-01-02")
		}
	}

	totalPages := int(total) / perPage
	if int(total)%perPage > 0 {
		totalPages++
	}

	response.SuccessWithMeta(c, txnResponses, &response.Meta{
		Page:       page,
		PerPage:    perPage,
		Total:      total,
		TotalPages: totalPages,
	})
}

func (h *StudentHandler) GetStudentRequests(c *gin.Context) {
	studentID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "Invalid student ID")
		return
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	perPage, _ := strconv.Atoi(c.DefaultQuery("per_page", "20"))
	if perPage > 100 {
		perPage = 100
	}
	offset := (page - 1) * perPage

	status := c.Query("status")
	requestType := c.DefaultQuery("request_type", string(sqlcdb.RequestTypeReservation))
	if requestType != string(sqlcdb.RequestTypeReservation) && requestType != string(sqlcdb.RequestTypeRequest) {
		response.BadRequest(c, "Invalid request type")
		return
	}

	authUser := middleware.GetAuthUser(c)
	if authUser.Role == "student" {
		authStudent, lookupErr := h.queries.GetStudentByID(c.Request.Context(), studentID)
		if lookupErr != nil || fromPgUUID(authStudent.UserID).String() != authUser.ID {
			response.Forbidden(c, "Cannot view other student's requests")
			return
		}
	}

	requests, err := h.queries.ListRequestsByStudentAndType(c.Request.Context(), sqlcdb.ListRequestsByStudentAndTypeParams{
		StudentID:   toPgUUID(studentID),
		RequestType: sqlcdb.RequestType(requestType),
		Status:      toPgRequestStatus(status),
		Offset:      int32(offset),
		Limit:       int32(perPage),
	})
	if err != nil {
		response.InternalError(c, "Failed to fetch requests")
		return
	}

	requestResponses := make([]gin.H, len(requests))
	for i, r := range requests {
		requestStatus := "pending"
		if r.Status.Valid {
			requestStatus = string(r.Status.RequestStatus)
		}

		requestResponses[i] = gin.H{
			"id":          r.ID.String(),
			"studentId":   r.StudentID.String(),
			"studentCode": r.StudentID_2,
			"studentName": r.StudentName,
			"bookId":      r.BookID.String(),
			"bookTitle":   r.BookTitle,
			"bookAuthor":  r.BookAuthor,
			"requestType": string(r.RequestType),
			"status":      requestStatus,
			"notes":       fromPgText(r.Notes),
			"requestDate": fromPgTimestamp(r.RequestDate).Format("2006-01-02T15:04:05Z07:00"),
			"processedAt": formatPgTimestamp(r.ProcessedAt, "2006-01-02T15:04:05Z07:00"),
		}
	}

	response.SuccessWithMeta(c, requestResponses, &response.Meta{
		Page:    page,
		PerPage: perPage,
		Total:   int64(len(requestResponses)),
	})
}

// FineResponse represents a fine in API responses
type FineResponse struct {
	ID            string    `json:"id"`
	TransactionID string    `json:"transactionId,omitempty"`
	StudentID     string    `json:"studentId"`
	BookID        string    `json:"bookId,omitempty"`
	BookTitle     string    `json:"bookTitle,omitempty"`
	Amount        float64   `json:"amount"`
	Reason        string    `json:"reason"`
	Status        string    `json:"status"`
	PaidDate      string    `json:"paidDate,omitempty"`
	CreatedAt     time.Time `json:"createdAt"`
}

// GetStudentFines returns fines for a student
func (h *StudentHandler) GetStudentFines(c *gin.Context) {
	studentID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "Invalid student ID")
		return
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	perPage, _ := strconv.Atoi(c.DefaultQuery("per_page", "20"))
	if perPage > 100 {
		perPage = 100
	}
	offset := (page - 1) * perPage

	authUser := middleware.GetAuthUser(c)
	if authUser.Role == "student" {
		authStudent, lookupErr := h.queries.GetStudentByID(c.Request.Context(), studentID)
		if lookupErr != nil || fromPgUUID(authStudent.UserID).String() != authUser.ID {
			response.Forbidden(c, "Cannot view other student's fines")
			return
		}
	}

	fines, err := h.queries.ListFinesByStudent(c.Request.Context(), sqlcdb.ListFinesByStudentParams{
		StudentID: toPgUUID(studentID),
		Limit:     int32(perPage),
		Offset:    int32(offset),
	})
	if err != nil {
		response.InternalError(c, "Failed to fetch fines")
		return
	}

	total, _ := h.queries.CountFinesByStudent(c.Request.Context(), toPgUUID(studentID))

	fineResponses := make([]FineResponse, len(fines))
	for i, f := range fines {
		fineResponses[i] = FineResponse{
			ID:        f.ID.String(),
			StudentID: fromPgUUID(f.StudentID).String(),
			BookTitle: fromPgText(f.BookTitle),
			Amount:    fromPgNumeric(f.Amount),
			Reason:    fromPgText(f.Description),
			Status:    getFineStatus(f.Status),
			CreatedAt: fromPgTimestamp(f.CreatedAt),
		}
		if f.TransactionID.Valid {
			fineResponses[i].TransactionID = uuid.UUID(f.TransactionID.Bytes).String()
		}
	}

	totalPages := int(total) / perPage
	if int(total)%perPage > 0 {
		totalPages++
	}

	response.SuccessWithMeta(c, fineResponses, &response.Meta{
		Page:       page,
		PerPage:    perPage,
		Total:      total,
		TotalPages: totalPages,
	})
}

// Helper function for transaction status
func getTransactionStatus(s sqlcdb.NullTransactionStatus) string {
	if s.Valid {
		return string(s.TransactionStatus)
	}
	return "borrowed"
}

// ReserveBookRequest represents the reserve book request
type ReserveBookRequest struct {
	BookID string `json:"book_id" binding:"required"`
	Notes  string `json:"notes"`
}

// ReserveBook creates a book reservation for a student
func (h *StudentHandler) ReserveBook(c *gin.Context) {
	authUser := middleware.GetAuthUser(c)
	if authUser == nil {
		response.Unauthorized(c, "User not authenticated")
		return
	}

	var req ReserveBookRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request body")
		return
	}

	// Validate book ID
	bookID, err := uuid.Parse(req.BookID)
	if err != nil {
		response.BadRequest(c, "Invalid book ID")
		return
	}

	// Get authenticated user's student record
	userID, err := uuid.Parse(authUser.ID)
	if err != nil {
		response.InternalError(c, "Invalid user ID")
		return
	}

	student, err := h.queries.GetStudentByUserID(c.Request.Context(), toPgUUID(userID))
	if err != nil {
		response.NotFound(c, "Student profile not found")
		return
	}

	// Check if student account is active
	if !isStudentStatusActive(student.Status) {
		response.BadRequest(c, "Student account is not active")
		return
	}

	// Check student's current loans (limit total active loans + reservations)
	currentLoans, err := h.queries.GetStudentCurrentLoans(c.Request.Context(), toPgUUID(student.ID))
	if err != nil {
		response.InternalError(c, "Failed to fetch current loans")
		return
	}
	if currentLoans >= int64(h.config.DefaultMaxBooks) {
		response.BadRequest(c, "You have reached the maximum limit for loans and reservations")
		return
	}

	// Check if the book exists
	book, err := h.queries.GetBookByID(c.Request.Context(), bookID)
	if err != nil {
		response.NotFound(c, "Book not found")
		return
	}

	// Check if book is active
	if book.Status.Valid && book.Status.BookStatus != sqlcdb.BookStatusActive {
		response.BadRequest(c, "Book is not available for reservation")
		return
	}

	// Check if there are available copies
	copies, err := h.queries.ListCopiesByBook(c.Request.Context(), toPgUUID(bookID))
	if err != nil || len(copies) == 0 {
		response.NotFound(c, "No copies available for this book")
		return
	}

	reservationExists, err := h.queries.HasPendingReservation(c.Request.Context(), sqlcdb.HasPendingReservationParams{
		StudentID: toPgUUID(student.ID),
		BookID:    toPgUUID(bookID),
	})
	if err != nil {
		response.InternalError(c, "Failed to validate existing reservations")
		return
	}
	if reservationExists {
		response.BadRequest(c, "You already have a pending reservation for this book")
		return
	}

	// Create the reservation request
	request, err := h.queries.CreateRequest(c.Request.Context(), sqlcdb.CreateRequestParams{
		StudentID:   toPgUUID(student.ID),
		BookID:      toPgUUID(bookID),
		RequestType: sqlcdb.RequestTypeReservation,
		Notes:       toPgText(req.Notes),
	})
	if err != nil {
		response.InternalError(c, "Failed to create reservation")
		return
	}

	response.Success(c, gin.H{
		"id":           request.ID.String(),
		"book_title":   book.Title,
		"request_type": "reservation",
		"status":       "pending",
	}, "Book reservation created successfully")
}

type FavoriteBookResponse struct {
	ID         string    `json:"id"`
	BookID     string    `json:"bookId"`
	Title      string    `json:"title"`
	Author     string    `json:"author"`
	ISBN       string    `json:"isbn,omitempty"`
	CoverImage string    `json:"coverImage,omitempty"`
	AddedAt    time.Time `json:"addedAt"`
}

func mapFavoriteBookRow(f sqlcdb.ListFavoriteBooksRow) FavoriteBookResponse {
	addedAt := time.Time{}
	if f.CreatedAt.Valid {
		addedAt = f.CreatedAt.Time
	}
	return FavoriteBookResponse{
		ID:         f.ID.String(),
		BookID:     f.BookID.String(),
		Title:      f.Title,
		Author:     f.Author,
		ISBN:       fromPgText(f.Isbn),
		CoverImage: fromPgText(f.CoverUrl),
		AddedAt:    addedAt,
	}
}

func (h *StudentHandler) GetMyFavorites(c *gin.Context) {
	authUser := middleware.GetAuthUser(c)
	if authUser == nil {
		response.Unauthorized(c, "User not authenticated")
		return
	}

	userID, err := uuid.Parse(authUser.ID)
	if err != nil {
		response.InternalError(c, "Invalid user ID")
		return
	}

	student, err := h.queries.GetStudentByUserID(c.Request.Context(), toPgUUID(userID))
	if err != nil {
		response.NotFound(c, "Student profile not found")
		return
	}

	favorites, err := h.queries.ListFavoriteBooks(c.Request.Context(), student.ID)
	if err != nil {
		response.InternalError(c, "Failed to fetch favorites")
		return
	}

	favoriteResponses := make([]FavoriteBookResponse, len(favorites))
	for i, f := range favorites {
		favoriteResponses[i] = mapFavoriteBookRow(f)
	}

	response.Success(c, favoriteResponses, "")
}

// AddFavoriteRequest represents the add favorite request
type AddFavoriteRequest struct {
	BookID string `json:"book_id" binding:"required"`
}

// AddFavorite adds a book to the student's favorites
func (h *StudentHandler) AddFavorite(c *gin.Context) {
	authUser := middleware.GetAuthUser(c)
	if authUser == nil {
		response.Unauthorized(c, "User not authenticated")
		return
	}

	var req AddFavoriteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request body")
		return
	}

	userID, err := uuid.Parse(authUser.ID)
	if err != nil {
		response.InternalError(c, "Invalid user ID")
		return
	}

	student, err := h.queries.GetStudentByUserID(c.Request.Context(), toPgUUID(userID))
	if err != nil {
		response.NotFound(c, "Student profile not found")
		return
	}

	bookID, err := uuid.Parse(req.BookID)
	if err != nil {
		response.BadRequest(c, "Invalid book ID")
		return
	}

	// Check if book exists
	_, err = h.queries.GetBookByID(c.Request.Context(), bookID)
	if err != nil {
		response.NotFound(c, "Book not found")
		return
	}

	favorite, err := h.queries.AddFavoriteBook(c.Request.Context(), sqlcdb.AddFavoriteBookParams{
		StudentID: student.ID,
		BookID:    bookID,
	})
	if err != nil {
		response.Conflict(c, "Book already in favorites")
		return
	}

	response.Created(c, FavoriteBookResponse{
		ID:      favorite.ID.String(),
		BookID:  favorite.BookID.String(),
		AddedAt: favorite.CreatedAt.Time,
	}, "Book added to favorites")
}

// RemoveFavorite removes a book from the student's favorites
func (h *StudentHandler) RemoveFavorite(c *gin.Context) {
	authUser := middleware.GetAuthUser(c)
	if authUser == nil {
		response.Unauthorized(c, "User not authenticated")
		return
	}

	bookID, err := uuid.Parse(c.Param("bookId"))
	if err != nil {
		response.BadRequest(c, "Invalid book ID")
		return
	}

	userID, err := uuid.Parse(authUser.ID)
	if err != nil {
		response.InternalError(c, "Invalid user ID")
		return
	}

	student, err := h.queries.GetStudentByUserID(c.Request.Context(), toPgUUID(userID))
	if err != nil {
		response.NotFound(c, "Student profile not found")
		return
	}

	err = h.queries.RemoveFavoriteBook(c.Request.Context(), sqlcdb.RemoveFavoriteBookParams{
		StudentID: student.ID,
		BookID:    bookID,
	})
	if err != nil {
		response.NotFound(c, "Favorite not found")
		return
	}

	response.Success(c, nil, "Book removed from favorites")
}

type AchievementResponse struct {
	ID               string    `json:"id"`
	Code             string    `json:"code"`
	Name             string    `json:"name"`
	Description      string    `json:"description"`
	Icon             string    `json:"icon"`
	Color            string    `json:"color"`
	RequirementType  string    `json:"requirementType"`
	RequirementValue int32     `json:"requirementValue"`
	UnlockedAt       time.Time `json:"unlockedAt,omitempty"`
	IsUnlocked       bool      `json:"isUnlocked"`
}

func mapAchievementRow(a sqlcdb.GetStudentAchievementsRow) AchievementResponse {
	resp := AchievementResponse{
		ID:               a.ID.String(),
		Code:             a.Code,
		Name:             a.Name,
		Description:      a.Description,
		Icon:             fromPgText(a.Icon),
		Color:            fromPgText(a.Color),
		RequirementType:  a.RequirementType,
		RequirementValue: a.RequirementValue,
		IsUnlocked:       a.UnlockedAt.Valid,
	}
	if a.UnlockedAt.Valid {
		resp.UnlockedAt = a.UnlockedAt.Time
	}
	return resp
}

func (h *StudentHandler) GetMyAchievements(c *gin.Context) {
	authUser := middleware.GetAuthUser(c)
	if authUser == nil {
		response.Unauthorized(c, "User not authenticated")
		return
	}

	userID, err := uuid.Parse(authUser.ID)
	if err != nil {
		response.InternalError(c, "Invalid user ID")
		return
	}

	student, err := h.queries.GetStudentByUserID(c.Request.Context(), toPgUUID(userID))
	if err != nil {
		response.NotFound(c, "Student profile not found")
		return
	}

	achievements, err := h.queries.GetStudentAchievements(c.Request.Context(), student.ID)
	if err != nil {
		response.InternalError(c, "Failed to fetch achievements")
		return
	}

	achievementResponses := make([]AchievementResponse, len(achievements))
	for i, a := range achievements {
		achievementResponses[i] = mapAchievementRow(a)
	}

	response.Success(c, achievementResponses, "")
}

func (h *StudentHandler) GetAllAchievements(c *gin.Context) {
	authUser := middleware.GetAuthUser(c)
	if authUser == nil {
		response.Unauthorized(c, "User not authenticated")
		return
	}

	achievements, err := h.queries.ListAchievements(c.Request.Context())
	if err != nil {
		response.InternalError(c, "Failed to fetch achievements")
		return
	}

	achievementResponses := make([]AchievementResponse, len(achievements))
	for i, a := range achievements {
		achievementResponses[i] = AchievementResponse{
			ID:               a.ID.String(),
			Code:             a.Code,
			Name:             a.Name,
			Description:      a.Description,
			Icon:             fromPgText(a.Icon),
			Color:            fromPgText(a.Color),
			RequirementType:  a.RequirementType,
			RequirementValue: a.RequirementValue,
			IsUnlocked:       false,
		}
	}

	response.Success(c, achievementResponses, "")
}

func getFineStatus(s sqlcdb.NullFineStatus) string {
	if s.Valid {
		return string(s.FineStatus)
	}
	return "pending"
}
