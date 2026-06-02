#!/usr/bin/env bash
#
# Scaffold a new lesson by cloning lesson-01-cv-fundamentals.
#
# Usage:
#   ./scripts/new_lesson.sh <slug>
#
# Example:
#   ./scripts/new_lesson.sh lesson-02-classification
#
# The slug becomes the new folder name under lessons/, and is also used as the
# new lesson's `id` in lesson.config.json. Sample images, exercises, and
# tutorial content are copied verbatim so the new lesson is immediately
# runnable; replace them as you build out the lesson.

set -euo pipefail

if [ $# -ne 1 ]; then
  echo "usage: $0 <slug>" >&2
  echo "example: $0 lesson-02-classification" >&2
  exit 2
fi

SLUG="$1"
if ! [[ "$SLUG" =~ ^lesson-[0-9]+(-[a-z0-9]+)+$ ]]; then
  echo "error: slug must match 'lesson-<NN>-<short-name>', e.g. lesson-02-classification" >&2
  exit 2
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
TEMPLATE="$REPO_ROOT/lessons/lesson-01-cv-fundamentals"
TARGET="$REPO_ROOT/lessons/$SLUG"

if [ ! -d "$TEMPLATE" ]; then
  echo "error: template lesson not found at $TEMPLATE" >&2
  exit 1
fi
if [ -e "$TARGET" ]; then
  echo "error: $TARGET already exists; pick a different slug or delete it first" >&2
  exit 1
fi

# Copy everything *except* generated / per-machine state.
mkdir -p "$TARGET"
rsync -a \
  --exclude 'frontend/node_modules' \
  --exclude 'frontend/dist' \
  --exclude 'backend/.work' \
  --exclude '__pycache__' \
  "$TEMPLATE/" "$TARGET/"

# The new lesson's id field needs to match the new slug. We use the leading
# "lesson-NN" portion as the id (the rest is purely a descriptive suffix).
rest="${SLUG#lesson-}"              # "02-classification"
num="${rest%%-*}"                   # "02"
SHORT_ID="lesson-$num"              # "lesson-02"

# Portable in-place sed across macOS / GNU.
sed_inplace() {
  if sed --version >/dev/null 2>&1; then
    sed -i "$@"
  else
    sed -i '' "$@"
  fi
}

sed_inplace -E "s/\"id\": \"lesson-01\"/\"id\": \"$SHORT_ID\"/" \
  "$TARGET/lesson.config.json"
sed_inplace -E "s/\"title\": \".*\"/\"title\": \"TODO: $SLUG title\"/" \
  "$TARGET/lesson.config.json"

# start.sh references the lesson path in its uvicorn invocation.
sed_inplace "s|lessons\.lesson-01-cv-fundamentals\.|lessons.${SLUG//-/_TMP_}.|g" \
  "$TARGET/start.sh"
# Restore hyphens — bash sed's -E doesn't let us escape hyphens easily, so we
# round-tripped through underscores. Now put the original hyphens back, but in
# the new slug.
sed_inplace "s|_TMP_|-|g" "$TARGET/start.sh"

echo ""
echo "✓ Scaffolded $TARGET"
echo ""
echo "Next steps:"
echo "  1. Replace assets:        $TARGET/assets/*.png"
echo "  2. Rewrite tutorial:      $TARGET/README.md"
echo "  3. Register your models:  $TARGET/backend/models_lesson01.py"
echo "                            (rename to models_${SHORT_ID//-/_}.py for clarity)"
echo "  4. Edit exercises:        $TARGET/backend/exercises/"
echo "  5. Update tests:          $TARGET/backend/tests.py"
echo "  6. Edit lesson.config.json title, exercises, self_checks_global"
echo "  7. Run it:                $TARGET/start.sh"
