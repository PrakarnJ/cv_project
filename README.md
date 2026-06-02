# cv-learning

A self-hosted, single-learner Computer Vision learning platform. Each lesson is
a standalone full-stack app (FastAPI backend + React frontend) that pairs a
structured tutorial with hands-on exercises and a live model playground. Lessons
live under `lessons/`, shared code under `shared/`, and every lesson starts with
one command.

## Prerequisites

- **`uv`** (Python 3.11 toolchain) — see <https://docs.astral.sh/uv/>
- **Node 20** — pinned via `lessons/<lesson>/frontend/.nvmrc`

Supported on Mac (Apple Silicon, MPS) and Ubuntu 24.04 (CUDA or CPU). PyTorch
device selection is automatic via `shared/device.py`.

## Start lesson-01

```bash
./lessons/lesson-01-cv-fundamentals/start.sh
```

Boots the FastAPI backend on `http://localhost:8000` and the Vite dev server on
`http://localhost:5173`. Open the frontend URL in your browser; Ctrl-C in the
terminal stops both.

The first run installs Python deps via `uv sync` and Node deps via `npm install`;
later runs skip both.

## Add a lesson

```bash
./scripts/new_lesson.sh lesson-02-classification
```

Clones lesson-01 as a template (slug must match `lesson-<NN>-<short-name>`),
rewrites the new lesson's `id` in `lesson.config.json`, and updates the uvicorn
path in its `start.sh`. The script prints the follow-up edits — swap assets,
rewrite the tutorial, register your own models, replace exercises and tests.

## Repo layout

```
lessons/             one folder per lesson — backend/, frontend/, assets/, start.sh
shared/              model registry, device selection, image utils, progress I/O
scripts/             new_lesson.sh and helpers
pyproject.toml       uv-managed Python deps
```

## Docs

| File              | What's in it                                              |
|-------------------|-----------------------------------------------------------|
| `prd.md`          | Goals, non-goals, functional requirements, 12-lesson roadmap |
| `architecture.md` | Backend API, frontend stack, model registry, JSON schemas |
| `design.md`       | UI layout, 4-tab structure, component map                 |
| `rules.md`        | Working agreement — read before any code change           |
| `tasks.md`        | Build plan (Phase 0 → Phase 4 acceptance checklist)       |
