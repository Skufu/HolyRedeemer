package utils

import (
	"testing"
)

func TestValidateQRCode(t *testing.T) {
	tests := []struct {
		name      string
		qrCode    string
		wantError bool
	}{
		{
			name:      "valid qr code",
			qrCode:    "HR-8a2b3c4d-C1",
			wantError: false,
		},
		{
			name:      "valid qr code double digit copy",
			qrCode:    "HR-8a2b3c4d-C12",
			wantError: false,
		},
		{
			name:      "valid qr code triple digit copy",
			qrCode:    "HR-8a2b3c4d-C123",
			wantError: false,
		},
		{
			name:      "empty qr code",
			qrCode:    "",
			wantError: true,
		},
		{
			name:      "missing HR prefix",
			qrCode:    "8a2b3c4d-C1",
			wantError: true,
		},
		{
			name:      "wrong prefix",
			qrCode:    "QR-8a2b3c4d-C1",
			wantError: true,
		},
		{
			name:      "missing copy indicator",
			qrCode:    "HR-8a2b3c4d-1",
			wantError: true,
		},
		{
			name:      "too short",
			qrCode:    "HR-123",
			wantError: true,
		},
		{
			name:      "invalid characters in book id part",
			qrCode:    "HR-8X2b3c4d-C1",
			wantError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ValidateQRCode(tt.qrCode)
			gotError := err != nil

			if gotError != tt.wantError {
				t.Errorf("ValidateQRCode() error = %v, wantError %v", err, tt.wantError)
			}
		})
	}
}

func TestGenerateQRCode(t *testing.T) {
	tests := []struct {
		name       string
		bookID     string
		copyNumber int32
		expectedQR string
	}{
		{
			name:       "generates qr code for copy 1",
			bookID:     "8a2b3c4d-5e6f7a8b9c0d1e2f3",
			copyNumber: 1,
			expectedQR: "HR-8a2b3c4d-C1",
		},
		{
			name:       "generates qr code for copy 5",
			bookID:     "8a2b3c4d-5e6f7a8b9c0d1e2f3",
			copyNumber: 5,
			expectedQR: "HR-8a2b3c4d-C5",
		},
		{
			name:       "generates qr code for copy 10",
			bookID:     "8a2b3c4d-5e6f7a8b9c0d1e2f3",
			copyNumber: 10,
			expectedQR: "HR-8a2b3c4d-C10",
		},
		{
			name:       "generates qr code for copy 99",
			bookID:     "8a2b3c4d-5e6f7a8b9c0d1e2f3",
			copyNumber: 99,
			expectedQR: "HR-8a2b3c4d-C99",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := GenerateQRCode(tt.bookID, tt.copyNumber)

			if got != tt.expectedQR {
				t.Errorf("GenerateQRCode() = %v, want %v", got, tt.expectedQR)
			}
		})
	}
}

func TestIntToString(t *testing.T) {
	tests := []struct {
		name  string
		input int32
		want  string
	}{
		{
			name:  "zero",
			input: 0,
			want:  "0",
		},
		{
			name:  "single digit",
			input: 1,
			want:  "1",
		},
		{
			name:  "double digit",
			input: 12,
			want:  "21",
		},
		{
			name:  "triple digit",
			input: 123,
			want:  "321",
		},
		{
			name:  "large number",
			input: 999,
			want:  "999",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := intToString(tt.input); got != tt.want {
				t.Errorf("intToString() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestParseQRCode(t *testing.T) {
	tests := []struct {
		name           string
		qrCode         string
		wantBookID     string
		wantCopyNumber int32
		wantError      bool
	}{
		{
			name:           "valid qr code",
			qrCode:         "HR-8a2b3c4d-C1",
			wantBookID:     "8a2b3c4d",
			wantCopyNumber: 1,
			wantError:      false,
		},
		{
			name:           "valid qr code with double digit copy",
			qrCode:         "HR-8a2b3c4d-C12",
			wantBookID:     "8a2b3c4d",
			wantCopyNumber: 12,
			wantError:      false,
		},
		{
			name:           "invalid format missing prefix",
			qrCode:         "8a2b3c4d-C1",
			wantBookID:     "",
			wantCopyNumber: 0,
			wantError:      true,
		},
		{
			name:           "invalid format wrong copy indicator",
			qrCode:         "HR-8a2b3c4d-1",
			wantBookID:     "",
			wantCopyNumber: 0,
			wantError:      true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			bookID, copyNumber, err := ParseQRCode(tt.qrCode)
			gotError := err != nil

			if gotError != tt.wantError {
				t.Errorf("ParseQRCode() error = %v, wantError %v", err, tt.wantError)
				return
			}

			if !tt.wantError {
				if bookID != tt.wantBookID {
					t.Errorf("ParseQRCode() bookID = %v, want %v", bookID, tt.wantBookID)
				}
				if copyNumber != tt.wantCopyNumber {
					t.Errorf("ParseQRCode() copyNumber = %v, want %v", copyNumber, tt.wantCopyNumber)
				}
			}
		})
	}
}
