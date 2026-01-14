package handlers

import (
	"fmt"
	"log"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/holyredeemer/library-api/internal/repositories/sqlcdb"
	"github.com/holyredeemer/library-api/pkg/response"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
)

type BookHandler struct {
	queries *sqlcdb.Queries
	db      *pgxpool.Pool
}

func NewBookHandler(queries *sqlcdb.Queries, db *pgxpool.Pool) *BookHandler {
	return &BookHandler{
		queries: queries,
		db:      db,
	}
}

// BookResponse represents a book in API responses (matches frontend types.ts)
type BookResponse struct {
	ID              string    `json:"id"`
	Title           string    `json:"title"`
	Author          string    `json:"author"`
	ISBN            string    `json:"isbn"`
	Category        string    `json:"category"`
	CategoryID      string    `json:"categoryId,omitempty"`
	CategoryColor   string    `json:"categoryColor,omitempty"`
	Publisher       string    `json:"publisher,omitempty"`
	PublicationYear int       `json:"publicationYear,omitempty"`
	Description     string    `json:"description,omitempty"`
	ShelfLocation   string    `json:"shelfLocation,omitempty"`
	CoverImage      string    `json:"coverImage,omitempty"`
	ReplacementCost float64   `json:"replacementCost"`
	TotalCopies     int64     `json:"totalCopies"`
	AvailableCopies int64     `json:"availableCopies"`
	Status          string    `json:"status"`
	CreatedAt       time.Time `json:"createdAt"`
	UpdatedAt       time.Time `json:"updatedAt"`
}

// ListBooks returns paginated list of books
func (h *BookHandler) ListBooks(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	perPage, _ := strconv.Atoi(c.DefaultQuery("per_page", "20"))
	if perPage > 100 {
		perPage = 100
	}
	offset := (page - 1) * perPage

	search := c.Query("search")
	categoryID := c.Query("category_id")

	var categoryUUID pgtype.UUID
	if categoryID != "" {
		if id, err := uuid.Parse(categoryID); err == nil {
			categoryUUID = toPgUUID(id)
		}
	}

	books, err := h.queries.ListBooks(c.Request.Context(), sqlcdb.ListBooksParams{
		Limit:      int32(perPage),
		Offset:     int32(offset),
		Search:     toPgText(search),
		CategoryID: categoryUUID,
	})

	if err != nil {
		response.InternalError(c, "Failed to fetch books")
		return
	}

	total, _ := h.queries.CountBooks(c.Request.Context(), sqlcdb.CountBooksParams{
		Search:     toPgText(search),
		CategoryID: categoryUUID,
	})

	// Convert to response format
	bookResponses := make([]BookResponse, len(books))
	for i, book := range books {
		bookResponses[i] = BookResponse{
			ID:              book.ID.String(),
			Title:           book.Title,
			Author:          book.Author,
			ISBN:            fromPgText(book.Isbn),
			Category:        fromPgText(book.CategoryName),
			CategoryColor:   fromPgText(book.CategoryColor),
			Publisher:       fromPgText(book.Publisher),
			PublicationYear: int(fromPgInt4(book.PublicationYear)),
			Description:     fromPgText(book.Description),
			ShelfLocation:   fromPgText(book.ShelfLocation),
			CoverImage:      fromPgText(book.CoverUrl),
			ReplacementCost: fromPgNumeric(book.ReplacementCost),
			TotalCopies:     book.TotalCopies,
			AvailableCopies: book.AvailableCopies,
			Status:          getBookStatus(book.Status),
			CreatedAt:       fromPgTimestamp(book.CreatedAt),
			UpdatedAt:       fromPgTimestamp(book.UpdatedAt),
		}
	}

	totalPages := int(total) / perPage
	if int(total)%perPage > 0 {
		totalPages++
	}

	response.SuccessWithMeta(c, bookResponses, &response.Meta{
		Page:       page,
		PerPage:    perPage,
		Total:      total,
		TotalPages: totalPages,
	})
}

// GetBook returns a single book by ID
func (h *BookHandler) GetBook(c *gin.Context) {
	bookID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "Invalid book ID")
		return
	}

	book, err := h.queries.GetBookByID(c.Request.Context(), bookID)
	if err != nil {
		response.NotFound(c, "Book not found")
		return
	}

	response.Success(c, BookResponse{
		ID:              book.ID.String(),
		Title:           book.Title,
		Author:          book.Author,
		ISBN:            fromPgText(book.Isbn),
		Category:        fromPgText(book.CategoryName),
		CategoryColor:   fromPgText(book.CategoryColor),
		Publisher:       fromPgText(book.Publisher),
		PublicationYear: int(fromPgInt4(book.PublicationYear)),
		Description:     fromPgText(book.Description),
		ShelfLocation:   fromPgText(book.ShelfLocation),
		CoverImage:      fromPgText(book.CoverUrl),
		ReplacementCost: fromPgNumeric(book.ReplacementCost),
		TotalCopies:     book.TotalCopies,
		AvailableCopies: book.AvailableCopies,
		Status:          getBookStatus(book.Status),
		CreatedAt:       fromPgTimestamp(book.CreatedAt),
		UpdatedAt:       fromPgTimestamp(book.UpdatedAt),
	}, "")
}

// CreateBookRequest represents the create book request
type CreateBookRequest struct {
	ISBN            string  `json:"isbn"`
	Title           string  `json:"title" binding:"required"`
	Author          string  `json:"author" binding:"required"`
	CategoryID      string  `json:"category_id"`
	Publisher       string  `json:"publisher"`
	PublicationYear int     `json:"publication_year"`
	Description     string  `json:"description"`
	ShelfLocation   string  `json:"shelf_location"`
	ReplacementCost float64 `json:"replacement_cost"`
	InitialCopies   int     `json:"initial_copies"`
}

// CreateBook creates a new book
func (h *BookHandler) CreateBook(c *gin.Context) {
	var req CreateBookRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request body")
		return
	}

	var categoryID pgtype.UUID
	if req.CategoryID != "" {
		if id, err := uuid.Parse(req.CategoryID); err == nil {
			categoryID = toPgUUID(id)
		}
	}

	// Begin transaction
	tx, err := h.db.Begin(c.Request.Context())
	if err != nil {
		response.InternalError(c, "Failed to begin transaction")
		return
	}
	defer func() {
		_ = tx.Rollback(c.Request.Context())
	}()

	// Use transactional queries
	queries := h.queries.WithTx(tx)

	book, err := queries.CreateBook(c.Request.Context(), sqlcdb.CreateBookParams{
		Isbn:            toPgText(req.ISBN),
		Title:           req.Title,
		Author:          req.Author,
		CategoryID:      categoryID,
		Publisher:       toPgText(req.Publisher),
		PublicationYear: toPgInt4(int32(req.PublicationYear)),
		Description:     toPgText(req.Description),
		ShelfLocation:   toPgText(req.ShelfLocation),
		ReplacementCost: toPgNumeric(req.ReplacementCost),
		Status:          sqlcdb.NullBookStatus{BookStatus: sqlcdb.BookStatusActive, Valid: true},
		IsDataComplete:  pgtype.Bool{Bool: true, Valid: true},
	})
	if err != nil {
		response.InternalError(c, "Failed to create book")
		return
	}

	// Create initial copies if specified
	copiesCreated := 0
	for i := 1; i <= req.InitialCopies; i++ {
		qrCode := fmt.Sprintf("HR-%s-C%d", book.ID.String()[:8], i)
		_, err := queries.CreateCopy(c.Request.Context(), sqlcdb.CreateCopyParams{
			BookID:     toPgUUID(book.ID),
			CopyNumber: int32(i),
			QrCode:     qrCode,
			Status:     sqlcdb.NullCopyStatus{CopyStatus: sqlcdb.CopyStatusAvailable, Valid: true},
			Condition:  sqlcdb.NullCopyCondition{CopyCondition: sqlcdb.CopyConditionGood, Valid: true},
		})
		if err != nil {
			log.Printf("Failed to create copy %d: %v", i, err)
			continue
		}
		copiesCreated++
	}

	// Commit transaction
	if err := tx.Commit(c.Request.Context()); err != nil {
		log.Printf("Failed to commit transaction: %v", err)
		response.InternalError(c, "Failed to complete book creation")
		return
	}

	response.Created(c, gin.H{
		"id":             book.ID.String(),
		"copies_created": copiesCreated,
	}, "Book created successfully")
}

// UpdateBook updates an existing book
func (h *BookHandler) UpdateBook(c *gin.Context) {
	bookID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "Invalid book ID")
		return
	}

	var req CreateBookRequest
	if bindErr := c.ShouldBindJSON(&req); bindErr != nil {
		response.BadRequest(c, "Invalid request body")
		return
	}

	var categoryID pgtype.UUID
	if req.CategoryID != "" {
		if id, parseErr := uuid.Parse(req.CategoryID); parseErr == nil {
			categoryID = toPgUUID(id)
		}
	}

	_, err = h.queries.UpdateBook(c.Request.Context(), sqlcdb.UpdateBookParams{
		ID:              bookID,
		Isbn:            toPgText(req.ISBN),
		Title:           toPgText(req.Title),
		Author:          toPgText(req.Author),
		CategoryID:      categoryID,
		Publisher:       toPgText(req.Publisher),
		PublicationYear: toPgInt4(int32(req.PublicationYear)),
		Description:     toPgText(req.Description),
		ShelfLocation:   toPgText(req.ShelfLocation),
		ReplacementCost: toPgNumeric(req.ReplacementCost),
	})
	if err != nil {
		response.InternalError(c, "Failed to update book")
		return
	}

	response.Success(c, nil, "Book updated successfully")
}

// DeleteBook archives a book
func (h *BookHandler) DeleteBook(c *gin.Context) {
	bookID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "Invalid book ID")
		return
	}

	if err := h.queries.DeleteBook(c.Request.Context(), bookID); err != nil {
		response.InternalError(c, "Failed to delete book")
		return
	}

	response.Success(c, nil, "Book archived successfully")
}

// CopyResponse represents a book copy in API responses
type CopyResponse struct {
	ID           string `json:"id"`
	BookID       string `json:"bookId"`
	CopyNumber   int32  `json:"copyNumber"`
	QRCode       string `json:"qrCode"`
	Status       string `json:"status"`
	Condition    string `json:"condition"`
	Notes        string `json:"notes,omitempty"`
	AcquiredDate string `json:"acquiredDate,omitempty"`
	IsBorrowed   bool   `json:"isBorrowed"`
	BorrowerID   string `json:"borrowerId,omitempty"`
	DueDate      string `json:"dueDate,omitempty"`
}

// ListCopies returns all copies of a book
func (h *BookHandler) ListCopies(c *gin.Context) {
	bookID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "Invalid book ID")
		return
	}

	copies, err := h.queries.ListCopiesByBook(c.Request.Context(), toPgUUID(bookID))
	if err != nil {
		response.InternalError(c, "Failed to fetch copies")
		return
	}

	copyResponses := make([]CopyResponse, len(copies))
	for i, copy := range copies {
		copyResponses[i] = CopyResponse{
			ID:         copy.ID.String(),
			BookID:     fromPgUUID(copy.BookID).String(),
			CopyNumber: copy.CopyNumber,
			QRCode:     copy.QrCode,
			Status:     getCopyStatus(copy.Status),
			Condition:  getCopyCondition(copy.Condition),
			Notes:      fromPgText(copy.Notes),
			IsBorrowed: copy.IsBorrowed,
		}
		if copy.BorrowerID.Valid {
			copyResponses[i].BorrowerID = uuid.UUID(copy.BorrowerID.Bytes).String()
		}
		if copy.DueDate.Valid {
			copyResponses[i].DueDate = copy.DueDate.Time.Format("2006-01-02")
		}
		if copy.AcquisitionDate.Valid {
			copyResponses[i].AcquiredDate = copy.AcquisitionDate.Time.Format("2006-01-02")
		}
	}

	response.Success(c, copyResponses, "")
}

// CreateCopyRequest represents the create copy request
type CreateCopyRequest struct {
	Condition       string `json:"condition"`
	AcquisitionDate string `json:"acquisition_date"`
	Notes           string `json:"notes"`
}

// CreateCopy creates a new book copy
func (h *BookHandler) CreateCopy(c *gin.Context) {
	bookID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "Invalid book ID")
		return
	}

	var req CreateCopyRequest
	_ = c.ShouldBindJSON(&req)

	// Get next copy number
	nextNum, _ := h.queries.GetNextCopyNumber(c.Request.Context(), toPgUUID(bookID))
	qrCode := fmt.Sprintf("HR-%s-C%d", bookID.String()[:8], nextNum)

	condition := sqlcdb.NullCopyCondition{CopyCondition: sqlcdb.CopyConditionGood, Valid: true}
	if req.Condition != "" {
		condition = sqlcdb.NullCopyCondition{CopyCondition: sqlcdb.CopyCondition(req.Condition), Valid: true}
	}

	copy, err := h.queries.CreateCopy(c.Request.Context(), sqlcdb.CreateCopyParams{
		BookID:     toPgUUID(bookID),
		CopyNumber: nextNum,
		QrCode:     qrCode,
		Status:     sqlcdb.NullCopyStatus{CopyStatus: sqlcdb.CopyStatusAvailable, Valid: true},
		Condition:  condition,
		Notes:      toPgText(req.Notes),
	})
	if err != nil {
		response.InternalError(c, "Failed to create copy")
		return
	}

	response.Created(c, gin.H{
		"id":      copy.ID.String(),
		"qr_code": copy.QrCode,
	}, "Copy created successfully")
}

// RegenerateQRCodeRequest represents the regenerate QR code request
type RegenerateQRCodeRequest struct {
	QRCode string `json:"qr_code" binding:"required"`
}

func (h *BookHandler) RegenerateQRCode(c *gin.Context) {
	qrCode := c.Param("qr_code")

	existingCopy, err := h.queries.GetCopyByQRCode(c.Request.Context(), qrCode)
	if err != nil {
		response.NotFound(c, "Copy not found")
		return
	}

	bookID := existingCopy.BookID

	// Get next copy number to generate new QR code
	newCopyNumber, err := h.queries.GetNextCopyNumber(c.Request.Context(), bookID)
	if err != nil {
		response.InternalError(c, "Failed to get next copy number")
		return
	}

	newQRCode := fmt.Sprintf("HR-%s-C%d", bookID.String()[:8], newCopyNumber)

	// Execute raw query to update QR code using sqlc-generated method
	_, err = h.queries.UpdateCopyQRCode(c.Request.Context(), sqlcdb.UpdateCopyQRCodeParams{
		ID:     existingCopy.ID,
		QrCode: newQRCode,
	})
	if err != nil {
		response.InternalError(c, "Failed to update QR code")
		return
	}

	response.Success(c, gin.H{
		"id":          existingCopy.ID.String(),
		"old_qr_code": qrCode,
		"new_qr_code": newQRCode,
	}, "QR code regenerated successfully")
}

// BulkRegenerateQRCodesRequest represents bulk regenerate request
type BulkRegenerateQRCodesRequest struct {
	BookID string `json:"book_id" binding:"required"`
}

func (h *BookHandler) BulkRegenerateQRCodes(c *gin.Context) {
	var req BulkRegenerateQRCodesRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request body")
		return
	}

	bookID, err := uuid.Parse(req.BookID)
	if err != nil {
		response.BadRequest(c, "Invalid book ID")
		return
	}

	copies, err := h.queries.ListCopiesByBook(c.Request.Context(), toPgUUID(bookID))
	if err != nil {
		response.InternalError(c, "Failed to fetch copies")
		return
	}

	for _, copy := range copies {
		newQRCode := fmt.Sprintf("HR-%s-C%d", bookID.String()[:8], copy.CopyNumber)
		_, err = h.queries.UpdateCopyQRCode(c.Request.Context(), sqlcdb.UpdateCopyQRCodeParams{
			ID:     copy.ID,
			QrCode: newQRCode,
		})
		if err != nil {
			response.InternalError(c, fmt.Sprintf("Failed to update QR code for copy %d", copy.CopyNumber))
			return
		}
	}

	response.Success(c, gin.H{
		"message": fmt.Sprintf("Successfully regenerated %d QR codes", len(copies)),
		"count":   len(copies),
	}, "Bulk regeneration completed")
}

// GetCopyByQR returns a copy by its QR code
func (h *BookHandler) GetCopyByQR(c *gin.Context) {
	qrCode := c.Param("qr_code")

	copy, err := h.queries.GetCopyByQRCode(c.Request.Context(), qrCode)
	if err != nil {
		response.NotFound(c, "Copy not found")
		return
	}

	// Check if currently borrowed
	var currentLoan interface{}
	if copy.Status.Valid && copy.Status.CopyStatus == sqlcdb.CopyStatusBorrowed {
		loan, err := h.queries.GetActiveLoanByCopy(c.Request.Context(), toPgUUID(copy.ID))
		if err == nil {
			currentLoan = gin.H{
				"transaction_id": loan.ID.String(),
				"due_date":       formatPgDate(loan.DueDate, "2006-01-02"),
				"status":         getTransactionStatus(loan.Status),
			}
		}
	}

	response.Success(c, gin.H{
		"id":          copy.ID.String(),
		"qr_code":     copy.QrCode,
		"copy_number": copy.CopyNumber,
		"status":      getCopyStatus(copy.Status),
		"condition":   getCopyCondition(copy.Condition),
		"book": gin.H{
			"id":     copy.BookID.String(),
			"title":  copy.BookTitle,
			"author": copy.BookAuthor,
		},
		"current_loan": currentLoan,
	}, "")
}

// ListCategories returns all categories
func (h *BookHandler) ListCategories(c *gin.Context) {
	categories, err := h.queries.ListCategories(c.Request.Context())
	if err != nil {
		response.InternalError(c, "Failed to fetch categories")
		return
	}

	catResponses := make([]gin.H, len(categories))
	for i, cat := range categories {
		catResponses[i] = gin.H{
			"id":          cat.ID.String(),
			"name":        cat.Name,
			"description": fromPgText(cat.Description),
			"color_code":  fromPgText(cat.ColorCode),
		}
	}

	response.Success(c, catResponses, "")
}

// CreateCategoryRequest represents the create category request
type CreateCategoryRequest struct {
	Name        string `json:"name" binding:"required"`
	Description string `json:"description"`
	ColorCode   string `json:"color_code"`
}

// CreateCategory creates a new category
func (h *BookHandler) CreateCategory(c *gin.Context) {
	var req CreateCategoryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request body")
		return
	}

	cat, err := h.queries.CreateCategory(c.Request.Context(), sqlcdb.CreateCategoryParams{
		Name:        req.Name,
		Description: toPgText(req.Description),
		ColorCode:   toPgText(req.ColorCode),
	})
	if err != nil {
		response.InternalError(c, "Failed to create category")
		return
	}

	response.Created(c, gin.H{"id": cat.ID.String()}, "Category created successfully")
}

// Helper functions for status extraction
func getBookStatus(s sqlcdb.NullBookStatus) string {
	if s.Valid {
		return string(s.BookStatus)
	}
	return "active"
}

func getCopyStatus(s sqlcdb.NullCopyStatus) string {
	if s.Valid {
		return string(s.CopyStatus)
	}
	return "available"
}

func getCopyCondition(c sqlcdb.NullCopyCondition) string {
	if c.Valid {
		return string(c.CopyCondition)
	}
	return "good"
}
