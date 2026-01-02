.PHONY: build run dev test clean migrate-up migrate-down migrate-create sqlc install-tools

# Build the application
build:
	go build -o bin/server ./cmd/server

# Run the application
run: build
	./bin/server

# Run with hot reload (requires air)
dev:
	air

# Run tests
test:
	go test -v ./...

# Clean build artifacts
clean:
	rm -rf bin/

# Install development tools
install-tools:
	go install github.com/air-verse/air@latest
	go install github.com/pressly/goose/v3/cmd/goose@latest
	go install github.com/sqlc-dev/sqlc/cmd/sqlc@latest

# Generate sqlc code
sqlc:
	sqlc generate

# Database migrations
migrate-up:
	goose -dir internal/database/migrations postgres "$(DATABASE_URL)" up

migrate-down:
	goose -dir internal/database/migrations postgres "$(DATABASE_URL)" down

migrate-status:
	goose -dir internal/database/migrations postgres "$(DATABASE_URL)" status

migrate-create:
	goose -dir internal/database/migrations create $(name) sql

# Seed the database
seed:
	goose -dir internal/database/migrations postgres "$(DATABASE_URL)" up

# Reset database (down all + up all)
migrate-reset:
	goose -dir internal/database/migrations postgres "$(DATABASE_URL)" reset

# Tidy dependencies
tidy:
	go mod tidy

# Format code
fmt:
	go fmt ./...

# Lint code (requires golangci-lint)
lint:
	golangci-lint run

# All in one setup
setup: install-tools tidy sqlc
	@echo "Setup complete!"
