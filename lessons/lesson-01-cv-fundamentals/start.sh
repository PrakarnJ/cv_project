#!/usr/bin/env bash
#
# One-command launcher for lesson-01-cv-fundamentals.
# Starts the FastAPI backend on :8000 and the Vite dev server on :5173.
# Stops both when the foreground shell exits (SIGINT / Ctrl-C).

set -euo pipefail

cd "$(dirname "$0")"
LESSON_ROOT="$(pwd)"
REPO_ROOT="$(cd ../.. && pwd)"

# Install Python deps via uv (idempotent).
cd "$REPO_ROOT"
uv sync

# Install Node deps the first time only.
cd "$LESSON_ROOT/frontend"
if [ ! -d node_modules ]; then
  npm install
fi

# When this shell exits, take down both background children.
trap 'kill 0' EXIT

(
  cd "$REPO_ROOT"
  uv run uvicorn \
    lessons.lesson-01-cv-fundamentals.backend.main:app \
    --reload --port 8002
) &

(
  cd "$LESSON_ROOT/frontend"
  npm run dev -- --port 5174
) &

wait
