package handlers

import (
	"math"
	"strconv"
	"time"

	"github.com/google/uuid"
	"github.com/holyredeemer/library-api/internal/repositories/sqlcdb"
	"github.com/jackc/pgx/v5/pgtype"
)

// Helper functions for pgtype conversions

// Text helpers
func toPgText(s string) pgtype.Text {
	if s == "" {
		return pgtype.Text{Valid: false}
	}
	return pgtype.Text{String: s, Valid: true}
}

func fromPgText(t pgtype.Text) string {
	if t.Valid {
		return t.String
	}
	return ""
}

// Int4 helpers
func toPgInt4(i int32) pgtype.Int4 {
	if i == 0 {
		return pgtype.Int4{Valid: false}
	}
	return pgtype.Int4{Int32: i, Valid: true}
}

func fromPgInt4(i pgtype.Int4) int32 {
	if i.Valid {
		return i.Int32
	}
	return 0
}

// Numeric (float64) helpers
func toPgNumeric(f float64) pgtype.Numeric {
	var num pgtype.Numeric
	if math.IsNaN(f) || math.IsInf(f, 0) {
		return pgtype.Numeric{Valid: false}
	}
	err := num.Scan(strconv.FormatFloat(f, 'f', -1, 64))
	if err != nil {
		return pgtype.Numeric{Valid: false}
	}
	return num
}

func fromPgNumeric(n pgtype.Numeric) float64 {
	if !n.Valid {
		return 0
	}
	f, err := n.Float64Value()
	if err != nil {
		return 0
	}
	if f.Valid {
		return f.Float64
	}
	return 0
}

// UUID helpers for pgtype.UUID (used for nullable foreign keys and function args)
func toPgUUID(id uuid.UUID) pgtype.UUID {
	return pgtype.UUID{Bytes: id, Valid: true}
}

func fromPgUUID(u pgtype.UUID) uuid.UUID {
	if u.Valid {
		return u.Bytes
	}
	return uuid.Nil
}

// Timestamp helpers
func toPgTimestamp(t time.Time) pgtype.Timestamp {
	return pgtype.Timestamp{Time: t, Valid: true}
}

func toPgTimestampNullable(t time.Time, valid bool) pgtype.Timestamp {
	if !valid {
		return pgtype.Timestamp{Valid: false}
	}
	return pgtype.Timestamp{Time: t, Valid: true}
}

func fromPgTimestamp(t pgtype.Timestamp) time.Time {
	if t.Valid {
		return t.Time
	}
	return time.Time{}
}

// Date helpers
func toPgDate(t time.Time) pgtype.Date {
	return pgtype.Date{Time: t, Valid: true}
}

func fromPgDate(d pgtype.Date) time.Time {
	if d.Valid {
		return d.Time
	}
	return time.Time{}
}

// Format helpers for pgtype date/time
func formatPgTimestamp(t pgtype.Timestamp, layout string) string {
	if t.Valid {
		return t.Time.Format(layout)
	}
	return ""
}

//nolint:unparam // layout is a format string parameter for consistency
func formatPgDate(d pgtype.Date, layout string) string {
	if d.Valid {
		return d.Time.Format(layout)
	}
	return ""
}

// Status helpers
func isUserActive(status sqlcdb.NullUserStatus) bool {
	return status.Valid && status.UserStatus == sqlcdb.UserStatusActive
}

func isStudentStatusActive(status sqlcdb.NullStudentStatus) bool {
	return status.Valid && status.StudentStatus == sqlcdb.StudentStatusActive
}

func getStudentStatusFromNull(status sqlcdb.NullStudentStatus) string {
	if status.Valid {
		return string(status.StudentStatus)
	}
	return "active"
}

// Nullable status helpers
func toPgStudentStatus(s string) sqlcdb.NullStudentStatus {
	if s == "" {
		return sqlcdb.NullStudentStatus{}
	}
	return sqlcdb.NullStudentStatus{StudentStatus: sqlcdb.StudentStatus(s), Valid: true}
}

func toPgFineStatus(s string) sqlcdb.NullFineStatus {
	if s == "" {
		return sqlcdb.NullFineStatus{}
	}
	return sqlcdb.NullFineStatus{FineStatus: sqlcdb.FineStatus(s), Valid: true}
}

func toPgRequestStatus(s string) sqlcdb.NullRequestStatus {
	if s == "" {
		return sqlcdb.NullRequestStatus{}
	}
	return sqlcdb.NullRequestStatus{RequestStatus: sqlcdb.RequestStatus(s), Valid: true}
}

func toPgUserStatus(s string) sqlcdb.NullUserStatus {
	if s == "" {
		return sqlcdb.NullUserStatus{}
	}
	return sqlcdb.NullUserStatus{UserStatus: sqlcdb.UserStatus(s), Valid: true}
}

func getUserStatus(status sqlcdb.NullUserStatus) string {
	if status.Valid {
		return string(status.UserStatus)
	}
	return "active"
}
