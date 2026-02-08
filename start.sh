#!/usr/bin/env sh
# start.sh - Railpack/Nixpacks entrypoint to run the FastAPI backend
# Location: repo root (ugahacks-11/start.sh)

set -eu

# Default port for Railway/Nixpacks. Railway sets $PORT for you, but we provide a fallback.
PORT="${PORT:-8000}"

# Path to backend directory
BACKEND_DIR="$(dirname "$0")/backend"

# Ensure backend directory exists
if [ ! -d "$BACKEND_DIR" ]; then
  echo "Backend directory not found at: $BACKEND_DIR"
  exit 1
fi

# Move into backend
cd "$BACKEND_DIR"

# Ensure Python dependencies are installed if running in a plain environment
if [ -f "requirements.txt" ]; then
  echo "Installing Python dependencies from requirements.txt..."
  # Use --no-cache-dir to reduce image size; ignore failures caused by already installed deps
  # Try python -m pip, pip3, then pip; skip if none found
  if command -v python >/dev/null 2>&1 && python -m pip --version >/dev/null 2>&1; then
    python -m pip install --no-cache-dir -r requirements.txt || true
  elif command -v python3 >/dev/null 2>&1 && python3 -m pip --version >/dev/null 2>&1; then
    python3 -m pip install --no-cache-dir -r requirements.txt || true
  elif command -v pip3 >/dev/null 2>&1; then
    pip3 install --no-cache-dir -r requirements.txt || true
  elif command -v pip >/dev/null 2>&1; then
    pip install --no-cache-dir -r requirements.txt || true
  else
    echo "WARNING: No pip found; skipping dependency installation."
  fi
fi

# Basic sanity check for DATABASE_URL (optional, but helpful)
if [ -z "${DATABASE_URL:-}" ]; then
  echo "WARNING: DATABASE_URL is not set. The backend will start but database operations may fail."
fi

# Run the FastAPI app via uvicorn
# Railway sets PORT automatically. Bind to 0.0.0.0 so the service is reachable.
echo "Starting backend on port ${PORT}..."
exec uvicorn main:app --host 0.0.0.0 --port "${PORT}"
