# Architecture Document — CV Learning Platform

## System Overview

A monorepo of independent lessons. Each lesson runs as a two-process app
(FastAPI backend + Vite/React frontend) on a developer's laptop. State is
file-based (no database). Lessons share code through a top-level `shared/`
module imported as a Python package.

```
       Browser (localhost:5173)
              │
              │  HTTP / SSE
              ▼
       FastAPI (localhost:8000)
        │              │
        │              └─→ shared/model_registry.py ─→ PyTorch / OpenCV
        │
        └─→ shared/progress.json  (read/write)
        └─→ pytest subprocess     (test runner)
```

---

## Repository Layout

```
cv-learning/
├── lessons/
│   ├── lesson-01-cv-fundamentals/      ← pilot
│   │   ├── README.md                   ← tutorial content
│   │   ├── lesson.config.json          ← metadata
│   │   ├── start.sh                    ← one-command launcher
│   │   ├── backend/
│   │   │   ├── main.py                 ← FastAPI app
│   │   │   ├── exercises.py            ← exercise definitions
│   │   │   ├── tests.py                ← pytest tests
│   │   │   └── solutions.py            ← reference solutions (hidden)
│   │   ├── frontend/
│   │   │   ├── package.json
│   │   │   ├── vite.config.js
│   │   │   ├── index.html
│   │   │   └── src/
│   │   │       ├── App.jsx
│   │   │       ├── api.js
│   │   │       ├── components/
│   │   │       ├── panels/
│   │   │       ├── widgets/
│   │   │       ├── hooks/
│   │   │       └── store/
│   │   └── assets/                     ← sample images
│   ├── lesson-02-.../                  ← future
│   └── ...
├── shared/
│   ├── __init__.py
│   ├── model_registry.py               ← swappable model registry
│   ├── device.py                       ← MPS/CUDA/CPU selection
│   ├── utils.py                        ← image I/O, base64 conversion
│   └── progress.json                   ← persisted user progress
├── scripts/
│   ├── new_lesson.sh                   ← scaffold new lesson from template
│   └── run_tests_all.sh                ← run all lesson tests
├── pyproject.toml                      ← uv-managed Python deps
├── uv.lock
├── .python-version
└── README.md
```

---

## Backend (FastAPI)

### Tech stack

- **Python 3.11+** managed by `uv`.
- **FastAPI** for HTTP API.
- **uvicorn** with `--reload` for dev.
- **PyTorch** (with MPS/CUDA support).
- **OpenCV** (`opencv-python-headless`).
- **pytest** for the test runner.
- **sse-starlette** for Server-Sent Events.

### File: `lesson-01/backend/main.py`

Top-level structure:

```python
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sse_starlette.sse import EventSourceResponse
from pydantic import BaseModel
from shared.model_registry import REGISTRY
from shared.utils import decode_image, encode_result
from . import exercises

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5173"], ...)
```

### API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/lesson` | Return lesson metadata from `lesson.config.json` |
| GET | `/tutorial` | Return README.md content as string |
| GET | `/models` | List models available in registry with param schema |
| POST | `/playground/infer` | Run inference on uploaded image |
| GET | `/exercises` | Return list of exercises in this lesson |
| GET | `/exercises/{id}` | Return specific exercise (starter code, hints, type) |
| POST | `/exercises/{id}/run` | Execute exercise code in sandbox; return stdout/stderr |
| POST | `/exercises/{id}/test` | Run pytest tests against exercise (SSE) |
| GET | `/progress` | Read `progress.json` |
| POST | `/progress` | Write `progress.json` (merge with existing) |

### Endpoint contracts

```python
class InferRequest(BaseModel):
    model_name: str
    params: dict
    image_base64: str

class InferResponse(BaseModel):
    annotated_image_base64: str
    detections: list[dict]
    inference_ms: float
    model: str

class ExerciseRunRequest(BaseModel):
    code: str

class ExerciseRunResponse(BaseModel):
    stdout: str
    stderr: str
    exit_code: int
    duration_ms: float
```

### Code execution sandbox

`POST /exercises/{id}/run` workflow:

1. Receive code as string.
2. Write to `/tmp/cv-learning/exercise-{id}-{uuid}.py`.
3. Run via `subprocess.run([sys.executable, tmpfile], timeout=30, capture_output=True)`.
4. Return captured streams. Delete temp file.

**Security note:** This is a single-user dev tool on the user's own machine.
No sandboxing beyond timeout. Not safe to expose to multi-tenant or network.

### Test runner (SSE)

`POST /exercises/{id}/test` writes the submitted code to a known module path
(e.g. `lesson-01/backend/.work/exercise_{id}.py`), then runs:

```bash
pytest backend/tests.py::test_exercise_{id} -v --tb=short --no-header
```

Stdout is streamed line-by-line as SSE events. Final event contains structured
JSON with pass/fail per test.

---

## Frontend (React + Vite)

### Tech stack

- **React 18** + **Vite 5**.
- **Tailwind CSS 3** for styling.
- **react-markdown** + **rehype-highlight** for tutorial rendering.
- **@monaco-editor/react** for the code editor.
- **@tanstack/react-query** for API state.
- **zustand** for local UI state.
- **axios** for HTTP.

### Routing

Single-page app. Tab state is in Zustand, not URL routes — reloading lands on
the Tutorial tab by default (intentional, to encourage re-reading).

### API client (`src/api.js`)

```js
import axios from 'axios';
export const api = axios.create({ baseURL: 'http://localhost:8000' });
export const getLesson = () => api.get('/lesson').then(r => r.data);
export const getModels = () => api.get('/models').then(r => r.data);
export const infer = (payload) => api.post('/playground/infer', payload).then(r => r.data);
```

For SSE (test runner), use `EventSource` directly, not axios.

---

## Shared Module

### `shared/device.py`

```python
import torch

def get_device() -> torch.device:
    if torch.backends.mps.is_available():
        return torch.device("mps")
    if torch.cuda.is_available():
        return torch.device("cuda")
    return torch.device("cpu")
```

### `shared/model_registry.py`

A registry pattern. Each model is registered with metadata and an `infer` callable.

```python
from dataclasses import dataclass
from typing import Callable, Any

@dataclass
class ModelEntry:
    name: str
    display_name: str
    param_schema: dict          # for dynamic UI sliders
    infer_fn: Callable[[Any, dict], dict]

REGISTRY: dict[str, ModelEntry] = {}

def register(name: str, display_name: str, param_schema: dict):
    def decorator(fn):
        REGISTRY[name] = ModelEntry(name, display_name, param_schema, fn)
        return fn
    return decorator
```

Example registration (in a lesson):

```python
from shared.model_registry import register

@register(
    name="opencv_blur",
    display_name="OpenCV Gaussian Blur",
    param_schema={"kernel_size": {"type": "int", "min": 1, "max": 31, "default": 5}},
)
def opencv_blur(image, params):
    import cv2
    k = params["kernel_size"]
    if k % 2 == 0: k += 1
    blurred = cv2.GaussianBlur(image, (k, k), 0)
    return {"image": blurred, "detections": []}
```

The frontend `<select>` is populated from `REGISTRY`. Sliders are generated
from `param_schema`. Adding a model = one Python file, no frontend changes.

### `shared/utils.py`

- `decode_image(base64_str) -> np.ndarray`
- `encode_image(np.ndarray) -> base64_str`
- `draw_detections(image, detections) -> np.ndarray`

---

## `lesson.config.json` Schema

```json
{
  "id": "lesson-01",
  "title": "CV Fundamentals",
  "subtitle": "Image tensors, OpenCV basics, convolutions",
  "estimated_minutes": 180,
  "exercises": [
    {
      "id": "ex1",
      "type": "fill_blank",
      "title": "Implement gaussian_blur",
      "starter_file": "backend/exercises/ex1_starter.py",
      "test_target": "test_gaussian_blur"
    },
    {
      "id": "ex2",
      "type": "scratch",
      "title": "Compute IoU between two boxes",
      "starter_file": "backend/exercises/ex2_starter.py",
      "test_target": "test_iou"
    },
    {
      "id": "ex3",
      "type": "tweak",
      "title": "Tune kernel size on edge detection",
      "playground_model": "opencv_edge",
      "self_checks": [
        "Tried kernel sizes 3, 5, 7, 9, 15",
        "Observed what happens with kernel_size > 15",
        "Wrote a 1-sentence reflection below"
      ]
    }
  ],
  "self_checks_global": [
    "I understand image tensor shapes (C,H,W) vs (H,W,C)",
    "I read the OpenCV filter2D docs"
  ]
}
```

---

## `progress.json` Schema

```json
{
  "lessons": {
    "lesson-01": {
      "started_at": "2026-05-19T08:00:00Z",
      "completed_at": null,
      "exercises": {
        "ex1": {"tests_passed": ["test_output_shape"], "tests_failed": ["test_blur_applied"], "last_code": "..."},
        "ex2": {"tests_passed": [], "tests_failed": [], "last_code": ""},
        "ex3": {"self_checks": [true, false, false], "reflection": ""}
      },
      "self_checks_global": [true, false]
    }
  }
}
```

---

## Start.sh Implementation

```bash
#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

LESSON_ROOT="$(pwd)"
REPO_ROOT="$(cd ../.. && pwd)"

cd "$REPO_ROOT"
uv sync

cd "$LESSON_ROOT/frontend"
[ ! -d node_modules ] && npm install

trap 'kill 0' EXIT

(cd "$REPO_ROOT" && uv run uvicorn "lessons.lesson-01-cv-fundamentals.backend.main:app" \
    --reload --port 8000) &

(cd "$LESSON_ROOT/frontend" && npm run dev -- --port 5173) &

wait
```

---

## Cross-Platform Considerations

| Concern | Mac (Apple Silicon) | Ubuntu 24.04 |
|---------|---------------------|--------------|
| Python install | `brew install uv` | `curl -LsSf https://astral.sh/uv/install.sh \| sh` (uv auto-downloads Python 3.11 per `.python-version`) |
| Node install | `brew install node` | nvm or NodeSource — apt's `nodejs` is 18.x and too old for Vite 8 (requires `^20.19.0 \|\| >=22.12.0`) |
| PyTorch wheel | PyPI default (MPS-enabled) | Pinned to `https://download.pytorch.org/whl/cu129` via `[tool.uv.sources]` in `pyproject.toml` |
| PyTorch device | `mps` | `cuda` if GPU else `cpu` |
| NVIDIA driver | n/a | RTX 50-series (Blackwell, sm_120) needs driver **570+**: `sudo ubuntu-drivers install nvidia:570`. CUDA toolkit is **not** required — the runtime ships in the wheel. |
| OpenCV install | `opencv-python-headless` via uv | same |
| Webcam | Browser handles natively | Browser handles natively |
| Webcam permission | macOS Camera permission | Linux /dev/video0 (browser asks) |
| rsync (for `scripts/new_lesson.sh`) | bundled with macOS | `sudo apt install rsync` (not in Server minimal) |

Per-platform torch resolution is wired through uv's universal lockfile
(`[tool.uv.sources]` with a `sys_platform == 'linux'` marker). Mac falls
through to the PyPI wheel; Linux pulls from the CUDA 12.9 index.

No OS-specific code branches except `shared/device.py`.

---

## Data Flow Example: Running an Exercise

```
1. User edits code in Monaco editor.
2. User clicks "Run tests".
3. Frontend POST /exercises/ex1/test with { code: "..." }.
4. Backend writes code to .work/exercise_ex1.py.
5. Backend spawns: pytest backend/tests.py::test_gaussian_blur.
6. Backend streams stdout via SSE.
7. Frontend renders each line in real-time.
8. On completion, backend POST /progress to update tests_passed/failed.
9. Frontend re-fetches /progress; updates Progress tab.
```

---

## Out of Scope (Future)

- WebSocket-based live inference for video.
- Auth + user accounts.
- Lesson marketplace / shareable lessons.
- Model training UI (lessons can use pre-trained for now).
