# Product Requirements Document — CV Learning Platform

## Overview

An interactive, self-hosted Computer Vision learning platform built for a single learner
(startup-focused, PyTorch, on-premise Mac/Ubuntu). Each lesson is a standalone full-stack
app: a FastAPI backend + React frontend that runs with one command. The platform covers
all major CV domains through structured tutorials, hands-on exercises, and a live model
playground where any model can be swapped at runtime.

---

## Goals

- Learn Computer Vision end-to-end from fundamentals to product deployment.
- Every concept is immediately interactive — no passive reading without a hands-on counterpart.
- One command starts any lesson: `./start.sh` inside the lesson folder.
- Models are swappable from a dropdown — the playground never requires code changes to try a new model.
- Progress is tracked automatically (auto tests) and manually (self-check checklists).

## Non-Goals

- Multi-user / authentication — single learner only.
- Cloud deployment — on-premise Mac (Apple Silicon) and Ubuntu 24.04 only.
- Mobile responsive UI — desktop browser only.
- Video hosting or streaming lessons — all content is local markdown + interactive demos.

---

## Target User

Single user: ML engineer with Python/ML experience, new to Computer Vision, building
toward a CV startup product. Commits ~5 hours/week. Prefers learning by doing over
reading documentation.

---

## Lesson Roadmap

| # | Title | CV Domain | Weeks |
|---|-------|-----------|-------|
| 01 | CV fundamentals + PyTorch basics | Foundation | 1–3 |
| 02 | CNNs + Image classification | Classification | 4–5 |
| 03 | Data pipelines + experiment tracking | MLOps | 6–8 |
| 04 | Object detection — YOLO + DETR | Detection | 9–12 |
| 05 | Image segmentation — SAM + Mask R-CNN | Segmentation | 13–16 |
| 06 | Face recognition — ArcFace + DeepFace | Face | 17–20 |
| 07 | OCR + Document AI | OCR | 21–24 |
| 08 | Video analysis — tracking + temporal | Video | 25–28 |
| 09 | Model optimization for on-premise | Deploy | 29–32 |
| 10 | FastAPI inference server | Deploy | 33–36 |
| 11 | Interactive playground UI | Product | 37–40 |
| 12 | Capstone product | Product | 41–52 |

**Pilot scope:** Build lesson-01 end-to-end as the template. All other lessons follow
the identical structure.

---

## Lesson Structure (per lesson)

### 1. Tutorial panel
- Renders `README.md` as rich content (headings, code blocks, inline images).
- May include embedded interactive concept demos (e.g. convolution visualizer).
- Learner reads before attempting exercises.

### 2. Playground
- Upload image or capture from webcam.
- Select model from dropdown (all models registered in `model_registry.py`).
- Adjust inference parameters via sliders (confidence, IoU threshold, etc.).
- Result displayed as annotated image on canvas overlay.
- No code changes needed to swap models.

### 3. Exercises (3 types per lesson)
- **Type A — Fill in the blank:** Pre-written function with `# TODO` gaps.
- **Type B — Write from scratch:** Empty function + docstring + visible test cases.
- **Type C — Tweak & experiment:** Working code + UI controls; observe and reflect.

### 4. Test runner
- "Run tests" button POSTs current exercise code to backend.
- Backend runs `pytest` and streams results back.
- Each test shows pass/fail with assertion diff.
- Self-check checklist for Type C exercises (manual tick).

### 5. Progress tracking
- Completion stored in `shared/progress.json`.
- Lesson marked done when: all auto-tests pass + all self-checks ticked.
- Next lesson unlocked on completion.

---

## Functional Requirements

### FR-01 One-command startup
`./start.sh` inside any lesson folder must start both backend (port 8000) and
frontend (port 5173) with a single terminal command, with no manual venv activation.

### FR-02 Model registry
All models accessed via `shared/model_registry.py`. Adding a new model requires
only adding one entry — no frontend changes. Registry handles device selection
(MPS / CUDA / CPU) automatically.

### FR-03 Playground inference
`POST /playground/infer` accepts image + model_name + params. Returns annotated
image as base64 + structured metadata (labels, scores, boxes). Latency target:
< 3 seconds on CPU for standard models.

### FR-04 Exercise execution
`POST /run-exercise` accepts exercise code as string. Backend writes to temp file,
executes with timeout (30s), returns stdout/stderr.

### FR-05 Test runner
`POST /run-tests` runs `pytest tests.py -v` for the active lesson. Streams output
line-by-line via Server-Sent Events (SSE). Returns structured pass/fail per test.

### FR-06 Progress persistence
`GET /progress` and `POST /progress` read/write `shared/progress.json`. Progress
never resets unless manually deleted.

### FR-07 Cross-platform device support
PyTorch device selected at runtime: `mps` (Apple Silicon), `cuda` (NVIDIA GPU),
`cpu` (fallback). One line change, no code duplication.

---

## Non-Functional Requirements

- **Startup time:** Both servers ready within 15 seconds of `./start.sh`.
- **Hot reload:** Backend auto-reloads on `.py` file save; frontend auto-reloads on `.jsx` save.
- **Offline:** All lessons work without internet after initial model download.
- **Mac + Ubuntu:** No OS-specific code outside device selection utility.
- **No Docker required:** Runs natively with uv + node.

---

## Success Criteria for Pilot (lesson-01)

- `./start.sh` starts both servers cleanly on Mac (Apple Silicon) and Ubuntu 24.04.
- Tutorial renders lesson-01 README.md with code highlighting.
- Playground accepts image upload, runs OpenCV operation, shows result.
- All 3 exercise types present and functional.
- Test runner shows pass/fail per pytest test in the UI.
- Self-check checklist saves state across page refresh.
- `progress.json` updated on lesson completion.
