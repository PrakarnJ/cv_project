# cv-learning

A self-hosted, single-learner Computer Vision learning platform. Each lesson is
a standalone full-stack app (FastAPI backend + React frontend) that pairs a
structured tutorial with hands-on exercises and a live model playground. Lessons
live under `lessons/`, shared code under `shared/`, and every lesson starts with
one command.

## Prerequisites

- **`uv`** (auto-installs Python 3.11 per `.python-version`) — <https://docs.astral.sh/uv/>
- **Node 20.19+** (pinned via `lessons/<lesson>/frontend/.nvmrc`; Vite 8 requires
  `^20.19.0 || >=22.12.0`)
- **`rsync`** — used by `scripts/new_lesson.sh`

PyTorch device is selected automatically by `shared/device.py`: `mps` on Mac
Apple Silicon, `cuda` on Linux with NVIDIA GPU, `cpu` otherwise.

### Mac (Apple Silicon)

```bash
brew install uv node rsync
```

### Ubuntu 24.04

Ubuntu's apt nodejs is 18.x, which is too old for Vite 8. Use nvm or NodeSource:

```bash
sudo apt update && sudo apt install -y curl git rsync ca-certificates

# uv
curl -LsSf https://astral.sh/uv/install.sh | sh

# Node 20 via nvm (matches frontend/.nvmrc)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
. ~/.nvm/nvm.sh && nvm install 20
```

If the box has an NVIDIA GPU (e.g. RTX 50-series Blackwell), install the
**570-series driver** before running anything:

```bash
sudo ubuntu-drivers install nvidia:570
sudo reboot
nvidia-smi   # confirm the GPU is visible
```

PyTorch's CUDA runtime libraries ship inside the wheel, so the standalone
CUDA toolkit is not required.

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
