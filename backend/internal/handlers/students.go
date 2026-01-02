package handlers

import (
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/holyredeemer/library-api/internal/middleware"
	"github.com/holyredeemer/library-api/internal/repositories/sqlcdb"
	"github.com/holyredeemer/library-api/internal/utils"
	"github.com/holyredeemer/library-api/pkg/response"
)

type StudentHandler struct {
	queries *sqlcdb.Queries
}

func NewStudentHandler(queries *sqlcdb.Queries) *StudentHandler {
	return &StudentHandler{queries: queries}
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

	total, _ := h.queries.CountStudents(c.Request.Context(), sqlcdb.CountStudentsParams{
		Search:     toPgText(search),
		GradeLevel: toPgInt4(int32(gradeLevel)),
		Section:    toPgText(section),
		Status:     toPgStudentStatus(status),
	})

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
		student, err := h.queries.GetStudentByID(c.Request.Context(), studentID)
		if err != nil {
			response.NotFound(c, "Student not found")
			return
		}
		if fromPgUUID(student.UserID).String() != authUser.ID {
			response.Forbidden(c, "Cannot view other student's profile")
			return
		}
	}

	student, err := h.queries.GetStudentByID(c.Request.Context(), studentID)
	if err != nil {
		response.NotFound(c, "Student not found")
		return
	}

	loans, _ := h.queries.GetStudentCurrentLoans(c.Request.Context(), toPgUUID(student.ID))
	fines, _ := h.queries.GetStudentTotalFines(c.Request.Context(), toPgUUID(student.ID))

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

	// Create user first
	user, err := h.queries.CreateUser(c.Request.Context(), sqlcdb.CreateUserParams{
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
	student, err := h.queries.CreateStudent(c.Request.Context(), sqlcdb.CreateStudentParams{
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
		// Rollback user creation
		_ = h.queries.DeleteUser(c.Request.Context(), user.ID)
		response.InternalError(c, "Failed to create student")
		return
	}

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
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request body")
		return
	}

	// Get existing student to update user record
	existing, err := h.queries.GetStudentByID(c.Request.Context(), studentID)
	if err != nil {
		response.NotFound(c, "Student not found")
		return
	}

	// Update user record if name or email provided
	if req.Name != "" || req.Email != "" {
		_, err = h.queries.UpdateUser(c.Request.Context(), sqlcdb.UpdateUserParams{
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
	_, err = h.queries.UpdateStudent(c.Request.Context(), sqlcdb.UpdateStudentParams{
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

	// Authorization check for students
	authUser := middleware.GetAuthUser(c)
	if authUser.Role == "student" {
		student, err := h.queries.GetStudentByID(c.Request.Context(), studentID)
		if err != nil || fromPgUUID(student.UserID).String() != authUser.ID {
			response.Forbidden(c, "Cannot view other student's loans")
			return
		}
	}

	transactions, err := h.queries.ListActiveTransactions(c.Request.Context(), sqlcdb.ListActiveTransactionsParams{
		Limit:     100,
		Offset:    0,
		StudentID: toPgUUID(studentID),
	})
	if err != nil {
		response.InternalError(c, "Failed to fetch loans")
		return
	}

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

	response.Success(c, txnResponses, "")
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
	offset := (page - 1) * perPage

	// Authorization check for students
	authUser := middleware.GetAuthUser(c)
	if authUser.Role == "student" {
		student, err := h.queries.GetStudentByID(c.Request.Context(), studentID)
		if err != nil || fromPgUUID(student.UserID).String() != authUser.ID {
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

	response.Success(c, txnResponses, "")
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

	// Authorization check for students
	authUser := middleware.GetAuthUser(c)
	if authUser.Role == "student" {
		student, err := h.queries.GetStudentByID(c.Request.Context(), studentID)
		if err != nil || fromPgUUID(student.UserID).String() != authUser.ID {
			response.Forbidden(c, "Cannot view other student's fines")
			return
		}
	}

	fines, err := h.queries.ListFinesByStudent(c.Request.Context(), toPgUUID(studentID))
	if err != nil {
		response.InternalError(c, "Failed to fetch fines")
		return
	}

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

	response.Success(c, fineResponses, "")
}

// Helper function for transaction status
func getTransactionStatus(s sqlcdb.NullTransactionStatus) string {
	if s.Valid {
		return string(s.TransactionStatus)
	}
	return "borrowed"
}

// Helper function for fine status
func getFineStatus(s sqlcdb.NullFineStatus) string {
	if s.Valid {
		return string(s.FineStatus)
	}
	return "pending"
}
