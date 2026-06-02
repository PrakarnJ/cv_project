#!/usr/bin/env bash
#
# One-command launcher for lesson-02-classification.
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
    lessons.lesson-02-classification.backend.main:app \
    --reload --port 8003
) &

(
  cd "$LESSON_ROOT/frontend"
  npm run dev -- --port 5175
) &

wait
