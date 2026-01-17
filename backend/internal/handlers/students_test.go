package handlers

import (
	"testing"

	"github.com/holyredeemer/library-api/internal/repositories/sqlcdb"
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
