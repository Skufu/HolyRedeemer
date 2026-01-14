#!/bin/bash

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function for setup
setup() {
    echo "Starting setup..."

    # Check for Docker
    if ! command_exists docker; then
        echo "Error: Docker is not installed. Please install Docker first."
        exit 1
    fi

    echo "1. Setting up Environment Variables..."
    
    # Backend .env
    if [ ! -f backend/.env ]; then
        echo "Creating backend/.env from example..."
        cp backend/.env.example backend/.env
    else
        echo "backend/.env already exists."
    fi

    # Frontend .env
    if [ ! -f frontend/.env ]; then
        echo "Creating frontend/.env from example..."
        cp frontend/.env.example frontend/.env
    else
        echo "frontend/.env already exists."
    fi

    echo "2. Starting Database..."
    docker-compose up -d postgres

    echo "Waiting for Database to be ready..."
    # Wait for postgres to be ready
    until docker-compose exec postgres pg_isready -U postgres; do
        echo "Waiting for postgres..."
        sleep 2
    done
    
    echo "3. Installing Backend Tools & Migrating Database..."
    cd backend
    
    # Install tools (air, goose, sqlc)
    if ! command_exists air || ! command_exists goose || ! command_exists sqlc; then 
         echo "Installing Go tools..."
         # DIRECT COMMANDS instead of make install-tools
         go install github.com/air-verse/air@latest
         go install github.com/pressly/goose/v3/cmd/goose@latest
         go install github.com/sqlc-dev/sqlc/cmd/sqlc@latest
    fi

    # Go Tidy
    go mod tidy
    
    # Run Migrations (includes seed if 002_seed_data.sql is present)
    echo "Running migrations..."
    
    # Load DATABASE_URL explicitly to avoid xargs issues on some shells
    # We grab the line starting with DATABASE_URL= and strip the prefix
    DATABASE_URL=$(grep "^DATABASE_URL=" .env | cut -d'=' -f2- | tr -d '\r' | tr -d '"' | tr -d "'")
    
    if [ -z "$DATABASE_URL" ]; then
        echo "Error: Could not find DATABASE_URL in backend/.env"
        exit 1
    fi

    echo "Using Database URL: $DATABASE_URL"
    
    # DIRECT COMMAND instead of make migrate-up
    # We use the DATABASE_URL from environment
    goose -dir internal/database/migrations postgres "$DATABASE_URL" up
    
    cd ..

    echo "4. Frontend Setup..."
    cd frontend
    npm install
    cd ..

    echo "Setup Complete! You can now run the app using './setup_and_run.sh --run'"
}

# Function for run
run() {
    echo "Starting application..."

    # Ensure DB is up
    docker-compose up -d postgres

    # Kill potential stray instances of air or server
    echo "Cleaning up any existing server/air processes..."
    taskkill //F //IM air.exe >/dev/null 2>&1 || true
    taskkill //F //IM main.exe >/dev/null 2>&1 || true
    taskkill //F //IM server.exe >/dev/null 2>&1 || true

    # Trap SIGINT to kill background processes
    trap 'kill $(jobs -p)' SIGINT

    echo "Starting Backend..."
    
    cd backend || { echo "Failed to cd to backend"; exit 1; }
    echo "Current Directory: $(pwd)"
    
    # Load .env variables
    echo "Loading backend environment variables..."
    if [ -f .env ]; then
        # Read file line by line to handle special chars better than simple xargs
        while IFS='=' read -r key value; do
            # Skip comments and empty lines
            if [[ $key =~ ^# ]] || [[ -z $key ]]; then
                continue
            fi
            # Trim whitespace/newlines
            key=$(echo "$key" | tr -d '[:space:]')
            value=$(echo "$value" | tr -d '\r')
            
            # Export if key is valid
            if [[ -n $key ]]; then
                export "$key=$value"
            fi
        done < .env
    fi

    # Run with air if available, else go run
    # On Windows (MINGW64/MSYS), Air might have issues with file watching or signals.
    OS_NAME=$(uname -s)
    if [[ "$OS_NAME" == *"MINGW"* ]] || [[ "$OS_NAME" == *"CYGWIN"* ]] || [[ "$OS_NAME" == *"MSYS"* ]]; then
        echo "Windows detected ($OS_NAME). Skipping Air and using 'go run'..."
        go run ./cmd/server &
    elif command_exists air; then
        echo "Starting Air with explicit config..."
        # Force use of local .air.toml
        if [ -f .air.toml ]; then
            air -c .air.toml &
        else 
             echo "Warning: .air.toml not found in backend!"
             air &
        fi
    else
        echo "Air not found, using go run..."
        go run ./cmd/server &
    fi
    BACKEND_PID=$!
    cd ..
    
    # Verify PWD
    echo "Back in root: $(pwd)"

    echo "Starting Frontend..."
    cd frontend
    npm run dev &
    FRONTEND_PID=$!
    cd ..

    echo "Application running... Press Ctrl+C to stop."
    echo "Backend PID: $BACKEND_PID"
    echo "Frontend PID: $FRONTEND_PID"

    # Wait for processes
    wait
}

# Cleanup function to kill children on exit
cleanup() {
    echo "Stopping processes..."
    # Kill all child processes in the current process group
    # On GIT BASH / Windows MinGW, handling signals can be tricky.
    # We try to kill the PID captured.
    
    if [ ! -z "$BACKEND_PID" ]; then
        echo "Killing Backend ($BACKEND_PID)..."
        kill $BACKEND_PID 2>/dev/null || true
    fi
    
    if [ ! -z "$FRONTEND_PID" ]; then
        echo "Killing Frontend ($FRONTEND_PID)..."
        kill $FRONTEND_PID 2>/dev/null || true
    fi
}

# Trap exit to cleanup
trap cleanup EXIT INT TERM

# Main logic
case "$1" in
    --setup)
        setup
        ;;
    --run)
        run
        ;;
    *)
        echo "Usage: $0 {--setup|--run}"
        echo "  --setup: Initialize env, start DB, run migrations/seeds."
        echo "  --run:   Start backend and frontend services."
        ;;
esac
