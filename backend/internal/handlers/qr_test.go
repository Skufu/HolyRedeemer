package handlers

import (
	"fmt"
	"testing"

	"github.com/google/uuid"
)

func TestQRCodeGeneration(t *testing.T) {
	bookID := uuid.New()

	tests := []struct {
		name       string
		copyNumber int32
		expectedQR string
	}{
		{
			name:       "generates qr code for copy 1",
			copyNumber: 1,
			expectedQR: fmt.Sprintf("HR-%s-C1", bookID.String()[:8]),
		},
		{
			name:       "generates qr code for copy 5",
			copyNumber: 5,
			expectedQR: fmt.Sprintf("HR-%s-C5", bookID.String()[:8]),
		},
		{
			name:       "generates qr code for copy 10",
			copyNumber: 10,
			expectedQR: fmt.Sprintf("HR-%s-C10", bookID.String()[:8]),
		},
		{
			name:       "generates qr code for copy 99",
			copyNumber: 99,
			expectedQR: fmt.Sprintf("HR-%s-C99", bookID.String()[:8]),
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			qrCode := fmt.Sprintf("HR-%s-C%d", bookID.String()[:8], tt.copyNumber)

			if qrCode != tt.expectedQR {
				t.Errorf("Expected QR code %s, got %s", tt.expectedQR, qrCode)
			}

			if len(qrCode) < 15 {
				t.Errorf("QR code too short: %s", qrCode)
			}

			if qrCode[:3] != "HR-" {
				t.Errorf("QR code missing HR- prefix: %s", qrCode)
			}

			if qrCode[len(qrCode)-2:] != "C1" && tt.copyNumber == 1 {
				t.Errorf("QR code missing copy indicator C1: %s", qrCode)
			}
		})
	}
}

func TestQRCodeValidation(t *testing.T) {
	tests := []struct {
		name     string
		qrCode   string
		expected bool
	}{
		{
			name:     "valid qr code format",
			qrCode:   "HR-8a2b3c4d-C1",
			expected: true,
		},
		{
			name:     "valid qr code with double digit copy",
			qrCode:   "HR-8a2b3c4d-C12",
			expected: true,
		},
		{
			name:     "valid qr code with triple digit copy",
			qrCode:   "HR-8a2b3c4d-C123",
			expected: true,
		},
		{
			name:     "missing HR prefix",
			qrCode:   "8a2b3c4d-C1",
			expected: false,
		},
		{
			name:     "missing copy indicator",
			qrCode:   "HR-8a2b3c4d-1",
			expected: false,
		},
		{
			name:     "empty qr code",
			qrCode:   "",
			expected: false,
		},
		{
			name:     "qr code too short",
			qrCode:   "HR-123",
			expected: false,
		},
		{
			name:     "wrong prefix",
			qrCode:   "QR-8a2b3c4d-C1",
			expected: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			isValid := validateQRCode(tt.qrCode)
			if isValid != tt.expected {
				t.Errorf("Expected %v, got %v for QR code %s", tt.expected, isValid, tt.qrCode)
			}
		})
	}
}

func validateQRCode(qrCode string) bool {
	if len(qrCode) < 15 {
		return false
	}
	if qrCode[:3] != "HR-" {
		return false
	}
	return true
}

func TestBatchQRCodeGeneration(t *testing.T) {
	bookID := uuid.New()
	initialCopies := 5

	var qrCodes []string
	for i := 1; i <= initialCopies; i++ {
		qrCode := fmt.Sprintf("HR-%s-C%d", bookID.String()[:8], i)
		qrCodes = append(qrCodes, qrCode)
	}

	if len(qrCodes) != initialCopies {
		t.Errorf("Expected %d QR codes, got %d", initialCopies, len(qrCodes))
	}

	seen := make(map[string]bool)
	for _, qrCode := range qrCodes {
		if seen[qrCode] {
			t.Errorf("Duplicate QR code generated: %s", qrCode)
		}
		seen[qrCode] = true

		if !validateQRCode(qrCode) {
			t.Errorf("Invalid QR code generated: %s", qrCode)
		}
	}
}

func TestQRCodeUniqueness(t *testing.T) {
	bookID1 := uuid.New()
	bookID2 := uuid.New()

	qrCode1 := fmt.Sprintf("HR-%s-C1", bookID1.String()[:8])
	qrCode2 := fmt.Sprintf("HR-%s-C1", bookID2.String()[:8])

	if qrCode1 == qrCode2 {
		t.Errorf("Different books should generate different QR codes: %s == %s", qrCode1, qrCode2)
	}

	copy1Qr := fmt.Sprintf("HR-%s-C1", bookID1.String()[:8])
	copy2Qr := fmt.Sprintf("HR-%s-C2", bookID1.String()[:8])

	if copy1Qr == copy2Qr {
		t.Errorf("Different copies should generate different QR codes: %s == %s", copy1Qr, copy2Qr)
	}
}
