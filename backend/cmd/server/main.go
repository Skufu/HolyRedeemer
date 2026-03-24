package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/holyredeemer/library-api/internal/cache"
	"github.com/holyredeemer/library-api/internal/config"
	"github.com/holyredeemer/library-api/internal/database"
	"github.com/holyredeemer/library-api/internal/handlers"
	"github.com/holyredeemer/library-api/internal/middleware"
	"github.com/holyredeemer/library-api/internal/repositories/sqlcdb"
	"github.com/holyredeemer/library-api/internal/utils"
	"github.com/holyredeemer/library-api/pkg/response"
	"github.com/joho/godotenv"
)

func main() {
	// Try to load .env from current directory or parent directory (for local dev convenience)
	if err := godotenv.Load(); err != nil {
		// If not found in current dir, try one level up (common when running from cmd/server)
		_ = godotenv.Load("../../.env")
	}

	// Load configuration
	cfg := config.Load()

	// Set Gin mode
	if cfg.Environment == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	// Initialize database
	db, err := database.New(cfg)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	log.Println("Connected to database successfully")

	// Initialize queries
	queries := sqlcdb.New(db.Pool)

	// Initialize cache
	appCache := cache.New()

	// Initialize JWT manager
	jwtManager := utils.NewJWTManager(
		cfg.JWTAccessSecret,
		cfg.JWTRefreshSecret,
		cfg.JWTAccessExpiry,
		cfg.JWTRefreshExpiry,
	)

	// Initialize handlers
	authHandler := handlers.NewAuthHandler(queries, jwtManager)
	bookHandler := handlers.NewBookHandler(queries, db.Pool, appCache)
	studentHandler := handlers.NewStudentHandler(queries, db.Pool, cfg)
	circulationHandler := handlers.NewCirculationHandler(queries, cfg, db.Pool, appCache)
	reportHandler := handlers.NewReportHandler(queries, appCache)
	fineHandler := handlers.NewFineHandler(queries, db.Pool, appCache)
	notificationHandler := handlers.NewNotificationHandler(queries)
	auditHandler := handlers.NewAuditHandler(queries)
	librarianHandler := handlers.NewLibrarianHandler(queries, db.Pool)
	settingsHandler := handlers.NewSettingsHandler(queries)
	requestHandler := handlers.NewRequestHandler(queries, cfg, db.Pool, appCache)
	adminHandler := handlers.NewAdminHandler(queries, db.Pool)
	cacheAdminHandler := handlers.NewCacheAdminHandler(appCache)
	backupHandler := handlers.NewBackupHandler(cfg)
	schoolYearHandler := handlers.NewSchoolYearHandler(queries, db.Pool)

	// Initialize router
	router := gin.New()
	router.Use(middleware.Recovery())
	router.Use(middleware.Logger())
	router.Use(middleware.CORSConfig(cfg.CORSOrigins))

	// Health check endpoint
	router.GET("/health", func(c *gin.Context) {
		if err := db.Health(c.Request.Context()); err != nil {
			response.InternalError(c, "Database connection failed")
			return
		}
		response.Success(c, gin.H{"status": "healthy"}, "Server is running")
	})

	// Lightweight healthz endpoint for uptime monitoring (UptimeRobot, etc.)
	// Does not check DB to avoid unnecessary load from frequent pings
	router.GET("/healthz", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})

	// API v1 routes
	v1 := router.Group("/api/v1")
	{
		// Auth routes (public)
		auth := v1.Group("/auth")
		{
			auth.POST("/login", authHandler.Login)
			auth.POST("/refresh", authHandler.RefreshToken)
			auth.POST("/logout", middleware.Auth(jwtManager), authHandler.Logout)
			auth.POST("/rfid/lookup", middleware.Auth(jwtManager), authHandler.RFIDLookup)
			auth.POST("/rfid/register", middleware.Auth(jwtManager), authHandler.RegisterRFID)
		}

		// Book routes
		books := v1.Group("/books")
		books.Use(middleware.Auth(jwtManager))
		{
			books.GET("", bookHandler.ListBooks)
			books.GET("/:id", bookHandler.GetBook)
			books.POST("", middleware.RequireRoles("librarian", "super_admin"), bookHandler.CreateBook)
			books.PUT("/:id", middleware.RequireRoles("librarian", "super_admin"), bookHandler.UpdateBook)
			books.DELETE("/:id", middleware.RequireRoles("super_admin"), bookHandler.DeleteBook)
			books.GET("/:id/copies", bookHandler.ListCopies)
			books.POST("/:id/copies", middleware.RequireRoles("librarian", "super_admin"), bookHandler.CreateCopy)
		}

		// Categories routes
		categories := v1.Group("/categories")
		categories.Use(middleware.Auth(jwtManager))
		{
			categories.GET("", bookHandler.ListCategories)
			categories.POST("", middleware.RequireRoles("admin", "super_admin"), bookHandler.CreateCategory)
		}

		// Copy lookup (for QR scanning)
		v1.GET("/copies/:qr_code", middleware.Auth(jwtManager), bookHandler.GetCopyByQR)
		v1.POST("/copies/:qr_code/regenerate", middleware.Auth(jwtManager), middleware.RequireRoles("admin", "super_admin"), bookHandler.RegenerateQRCode)
		v1.POST("/books/:id/copies/bulk-regenerate", middleware.Auth(jwtManager), middleware.RequireRoles("admin", "super_admin"), bookHandler.BulkRegenerateQRCodes)

		// Student routes
		students := v1.Group("/students")
		students.Use(middleware.Auth(jwtManager))
		{
			students.GET("/me", studentHandler.GetMe)
			students.GET("/me/dashboard", studentHandler.GetMyDashboard)
			students.GET("/me/favorites", studentHandler.GetMyFavorites)
			students.POST("/me/favorites", studentHandler.AddFavorite)
			students.DELETE("/me/favorites/:bookId", studentHandler.RemoveFavorite)
			students.GET("/me/achievements", studentHandler.GetMyAchievements)
			students.GET("/achievements", studentHandler.GetAllAchievements)
			students.GET("", middleware.RequireRoles("admin", "super_admin", "librarian"), studentHandler.ListStudents)
			students.GET("/:id", studentHandler.GetStudent)
			students.POST("", middleware.RequireRoles("admin", "super_admin"), studentHandler.CreateStudent)
			students.PUT("/:id", middleware.RequireRoles("admin", "super_admin", "librarian"), studentHandler.UpdateStudent)
			students.POST("/reserve", studentHandler.ReserveBook)
			students.GET("/:id/loans", studentHandler.GetStudentLoans)
			students.GET("/:id/history", studentHandler.GetStudentHistory)
			students.GET("/:id/requests", studentHandler.GetStudentRequests)
			students.GET("/:id/fines", studentHandler.GetStudentFines)
		}

		// Circulation routes
		circulation := v1.Group("/circulation")
		circulation.Use(middleware.Auth(jwtManager))
		{
			circulation.POST("/checkout", middleware.RequireRoles("librarian", "admin", "super_admin"), circulationHandler.Checkout)
			circulation.POST("/return", middleware.RequireRoles("librarian", "admin", "super_admin"), circulationHandler.Return)
			circulation.POST("/renew", circulationHandler.Renew)
			circulation.GET("/current", circulationHandler.ListCurrentLoans)
			circulation.GET("/overdue", circulationHandler.ListOverdue)
		}

		// Transaction routes
		v1.GET("/transactions", middleware.Auth(jwtManager), circulationHandler.ListTransactions)

		// Fine routes
		fines := v1.Group("/fines")
		fines.Use(middleware.Auth(jwtManager))
		{
			fines.GET("", fineHandler.ListFines)
			fines.GET("/:id", fineHandler.GetFine)
			fines.POST("/:id/pay", middleware.RequireRoles("librarian", "super_admin"), fineHandler.PayFine)
			fines.POST("/:id/waive", middleware.RequireRoles("super_admin"), fineHandler.WaiveFine)
		}

		// Report routes
		reports := v1.Group("/reports")
		reports.Use(middleware.Auth(jwtManager), middleware.RequireRoles("librarian", "super_admin"))
		{
			reports.GET("/dashboard", reportHandler.GetDashboardStats)
			reports.GET("/charts/categories", reportHandler.GetBooksByCategory)
			reports.GET("/charts/trends", reportHandler.GetMonthlyTrends)
			reports.GET("/charts/top-borrowed", reportHandler.GetTopBorrowedBooks)
			reports.GET("/activity", reportHandler.GetRecentActivity)
		}

		// Notification routes
		notifications := v1.Group("/notifications")
		notifications.Use(middleware.Auth(jwtManager))
		{
			notifications.GET("", notificationHandler.ListNotifications)
			notifications.GET("/unread-count", notificationHandler.GetUnreadCount)
			notifications.PUT("/:id/read", notificationHandler.MarkAsRead)
			notifications.PUT("/read-all", notificationHandler.MarkAllAsRead)
		}

		// Audit routes
		audit := v1.Group("/audit-logs")
		audit.Use(middleware.Auth(jwtManager), middleware.RequireRoles("admin", "super_admin"))
		{
			audit.GET("", auditHandler.ListAuditLogs)
		}

		// Librarian routes
		librarians := v1.Group("/librarians")
		librarians.Use(middleware.Auth(jwtManager), middleware.RequireRoles("admin", "super_admin"))
		{
			librarians.GET("", librarianHandler.ListLibrarians)
			librarians.POST("", librarianHandler.CreateLibrarian)
			librarians.GET("/:id", librarianHandler.GetLibrarian)
			librarians.PUT("/:id", librarianHandler.UpdateLibrarian)
			librarians.DELETE("/:id", librarianHandler.DeleteLibrarian)
		}

		// Admin routes
		admins := v1.Group("/admins")
		admins.Use(middleware.Auth(jwtManager), middleware.RequireRoles("super_admin"))
		{
			admins.GET("", adminHandler.ListAdmins)
			admins.POST("", adminHandler.CreateAdmin)
			admins.GET("/:id", adminHandler.GetAdmin)
			admins.PUT("/:id", adminHandler.UpdateAdmin)
			admins.DELETE("/:id", adminHandler.DeleteAdmin)
		}

		cacheRoutes := v1.Group("/cache")
		cacheRoutes.Use(middleware.Auth(jwtManager), middleware.RequireRoles("super_admin"))
		{
			cacheRoutes.POST("/clear", cacheAdminHandler.Clear)
		}

		schoolYearRoutes := v1.Group("/school-year")
		schoolYearRoutes.Use(middleware.Auth(jwtManager), middleware.RequireRoles("super_admin"))
		{
			schoolYearRoutes.POST("/export-archive", schoolYearHandler.ExportArchive)
			schoolYearRoutes.POST("/archive-graduates", schoolYearHandler.ArchiveGraduates)
			schoolYearRoutes.POST("/import-students", schoolYearHandler.ImportStudents)
			schoolYearRoutes.GET("/reports", schoolYearHandler.YearEndReports)
			schoolYearRoutes.POST("/reset-student-data", schoolYearHandler.ResetStudentData)
			schoolYearRoutes.PUT("/update-policies", schoolYearHandler.UpdatePolicies)
			schoolYearRoutes.GET("/export-students", schoolYearHandler.ExportStudents)
		}

		backupRoutes := v1.Group("/backup")
		backupRoutes.Use(middleware.Auth(jwtManager), middleware.RequireRoles("super_admin"))
		{
			backupRoutes.POST("/create", backupHandler.CreateBackup)
			backupRoutes.GET("/list", backupHandler.ListBackups)
			backupRoutes.GET("/download/:name", backupHandler.DownloadBackup)
		}

		// Settings routes
		settings := v1.Group("/settings")
		settings.Use(middleware.Auth(jwtManager))
		{
			settings.GET("", settingsHandler.ListSettings)
			settings.GET("/:key", settingsHandler.GetSetting)
			settings.PUT("", middleware.RequireRoles("admin", "super_admin"), settingsHandler.UpdateSettings)
			settings.GET("/borrowing", settingsHandler.GetBorrowingSettings)
			settings.GET("/fines", settingsHandler.GetFineSettings)
		}

		// Request routes
		requests := v1.Group("/requests")
		requests.Use(middleware.Auth(jwtManager))
		{
			requests.GET("", middleware.RequireRoles("admin", "super_admin", "librarian"), requestHandler.ListRequests)
			requests.POST("", requestHandler.CreateRequest)
			requests.GET("/pending-count", requestHandler.GetPendingCount)
			requests.PUT("/:id/approve", middleware.RequireRoles("librarian", "admin", "super_admin"), requestHandler.ApproveRequest)
			requests.PUT("/:id/reject", middleware.RequireRoles("librarian", "admin", "super_admin"), requestHandler.RejectRequest)
		}
	}

	// Create HTTP server
	srv := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Start server in goroutine
	go func() {
		log.Printf("Server starting on port %s", cfg.Port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server failed to start: %v", err)
		}
	}()

	// Graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("Shutting down server...")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Fatalf("Server forced to shutdown: %v", err)
	}

	log.Println("Server exited gracefully")
}
