package handlers

import (
	"context"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/holyredeemer/library-api/internal/config"
	"github.com/holyredeemer/library-api/pkg/response"
)

type BackupHandler struct {
	cfg *config.Config
}

func NewBackupHandler(cfg *config.Config) *BackupHandler {
	return &BackupHandler{cfg: cfg}
}

func (h *BackupHandler) CreateBackup(c *gin.Context) {
	filename := fmt.Sprintf("library_backup_%s.sql", time.Now().Format("2006-01-02_150405"))
	backupDir := filepath.Join(".", "backups")
	if err := os.MkdirAll(backupDir, 0o750); err != nil {
		response.InternalError(c, "Failed to prepare backup directory")
		return
	}

	filePath := filepath.Join(backupDir, filename)
	file, err := os.Create(filePath)
	if err != nil {
		response.InternalError(c, "Failed to create backup file")
		return
	}
	defer file.Close()

	if err := h.runPgDump(c.Request.Context(), file); err != nil {
		_ = os.Remove(filePath)
		response.InternalError(c, "Failed to create backup")
		return
	}

	if err := h.streamBackupFile(c, filePath, filename); err != nil {
		response.InternalError(c, "Failed to download backup")
		return
	}
}

func (h *BackupHandler) runPgDump(ctx context.Context, output *os.File) error {
	if _, err := exec.LookPath("pg_dump"); err != nil {
		return fmt.Errorf("pg_dump not available")
	}

	cmd := exec.CommandContext(ctx, "pg_dump", h.cfg.DatabaseURL)
	cmd.Stdout = output
	return cmd.Run()
}

func (h *BackupHandler) ListBackups(c *gin.Context) {
	backupDir := filepath.Join(".", "backups")
	entries, err := os.ReadDir(backupDir)
	if err != nil && !os.IsNotExist(err) {
		response.InternalError(c, "Failed to list backups")
		return
	}

	items := make([]gin.H, 0)
	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}
		name := entry.Name()
		if !strings.HasSuffix(name, ".sql") {
			continue
		}
		info, err := entry.Info()
		if err != nil {
			continue
		}
		items = append(items, gin.H{
			"name":      name,
			"size":      info.Size(),
			"createdAt": info.ModTime(),
		})
	}

	response.Success(c, items, "Backups retrieved")
}

func (h *BackupHandler) DownloadBackup(c *gin.Context) {
	name := c.Param("name")
	if name == "" || strings.Contains(name, "..") {
		response.BadRequest(c, "Invalid backup name")
		return
	}

	filePath := filepath.Join(".", "backups", name)
	if err := h.streamBackupFile(c, filePath, name); err != nil {
		response.InternalError(c, "Failed to download backup")
		return
	}
}

func (h *BackupHandler) streamBackupFile(c *gin.Context, filePath, filename string) error {
	ctx, cancel := context.WithTimeout(c.Request.Context(), 60*time.Second)
	defer cancel()

	file, err := os.Open(filePath)
	if err != nil {
		return err
	}
	defer file.Close()

	stat, err := file.Stat()
	if err != nil {
		return err
	}

	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", filename))
	c.Header("Content-Type", "application/sql")
	c.Header("Content-Length", fmt.Sprintf("%d", stat.Size()))

	_, err = io.Copy(c.Writer, file)
	if err != nil {
		return err
	}

	select {
	case <-ctx.Done():
		return ctx.Err()
	default:
		return nil
	}
}
