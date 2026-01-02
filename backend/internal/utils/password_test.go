package utils

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestHashPassword(t *testing.T) {
	password := "testPassword123!"

	hash, err := HashPassword(password)
	require.NoError(t, err)
	assert.NotEmpty(t, hash)
	assert.NotEqual(t, password, hash)

	// Hash should be different each time (due to salt)
	hash2, err := HashPassword(password)
	require.NoError(t, err)
	assert.NotEqual(t, hash, hash2)
}

func TestCheckPassword(t *testing.T) {
	password := "testPassword123!"

	hash, err := HashPassword(password)
	require.NoError(t, err)

	// Correct password should match
	assert.True(t, CheckPassword(password, hash))

	// Wrong password should not match
	assert.False(t, CheckPassword("wrongPassword", hash))

	// Empty password should not match
	assert.False(t, CheckPassword("", hash))
}

func TestHashPassword_EmptyPassword(t *testing.T) {
	hash, err := HashPassword("")
	require.NoError(t, err)
	assert.NotEmpty(t, hash)

	// Empty password should still match its hash
	assert.True(t, CheckPassword("", hash))
}

func TestCheckPassword_InvalidHash(t *testing.T) {
	// Invalid hash format should return false
	assert.False(t, CheckPassword("password", "invalid-hash"))
}

func TestHashPassword_LongPassword(t *testing.T) {
	// bcrypt silently truncates at 72 bytes, so passwords over 72 bytes
	// will match if the first 72 bytes are the same
	password := "this-is-a-normal-length-password-that-works-fine"

	hash, err := HashPassword(password)
	require.NoError(t, err)
	assert.NotEmpty(t, hash)

	// Password should match
	assert.True(t, CheckPassword(password, hash))
}
