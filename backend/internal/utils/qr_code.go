package utils

import (
	"errors"
	"fmt"
	"regexp"
	"strings"
)

var qrCodePattern = regexp.MustCompile(`^HR-[a-f0-9]{8}-C\d+$`)

var ErrInvalidQRCode = errors.New("invalid QR code format")
var ErrQRCodeTooShort = errors.New("QR code too short")
var ErrQRCodePrefixInvalid = errors.New("QR code must start with HR-")

func ValidateQRCode(qrCode string) error {
	if qrCode == "" {
		return ErrInvalidQRCode
	}

	if len(qrCode) < 12 {
		return ErrQRCodeTooShort
	}

	if !strings.HasPrefix(qrCode, "HR-") {
		return ErrQRCodePrefixInvalid
	}

	if !qrCodePattern.MatchString(qrCode) {
		return ErrInvalidQRCode
	}

	return nil
}

func GenerateQRCode(bookID string, copyNumber int32) string {
	if len(bookID) < 8 {
		return ""
	}

	return "HR-" + bookID[:8] + "-C" + fmt.Sprint(copyNumber)
}

func intToString(n int32) string {
	if n == 0 {
		return "0"
	}

	var result []byte
	for n > 0 {
		digit := n % 10
		result = append([]byte{byte('0' + digit)}, result...)
		n /= 10
	}

	for i, j := 0, len(result)-1; i < j; i, j = i+1, j-1 {
		result[i], result[j] = result[j], result[i]
	}

	return string(result)
}

func ParseQRCode(qrCode string) (bookID string, copyNumber int32, err error) {
	if err := ValidateQRCode(qrCode); err != nil {
		return "", 0, err
	}

	parts := strings.Split(qrCode, "-")
	if len(parts) != 3 {
		return "", 0, errors.New("invalid QR code structure")
	}

	bookPrefix := parts[1]
	copyPart := parts[2]

	if !strings.HasPrefix(copyPart, "C") {
		return "", 0, errors.New("invalid copy number format")
	}

	copyStr := copyPart[1:]
	return bookPrefix, parseCopyNumber(copyStr), nil
}

func parseCopyNumber(s string) int32 {
	var result int32
	for _, c := range s {
		result = result*10 + int32(c-'0')
	}
	return result
}
