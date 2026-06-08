# Tasks — CV Learning Platform Pilot (Lesson 01)

Execute tasks in order. Do not skip ahead. Each task has clear deliverables and
verification steps. Mark each `[ ]` → `[x]` when complete.

---

## Phase 0 — Repository Setup

### T0.1 — Initialize repo structure
- [ ] Create root folders: `lessons/`, `shared/`, `scripts/`, `lessons/lesson-01-cv-fundamentals/`.
- [ ] Create `.gitignore` covering: `__pycache__/`, `node_modules/`, `.work/`, `.venv/`, `*.pyc`, `.DS_Store`.
- [ ] Create root `README.md` with one paragraph describing the repo + how to start lesson-01.

**Verify:** `tree -L 2 -d` shows the expected folder layout.

### T0.2 — Configure Python environment with uv
- [ ] Create `.python-version` containing `3.11`.
- [ ] Run `uv init --no-readme` at repo root.
- [ ] Add dependencies:
      `uv add fastapi uvicorn[standard] sse-starlette pydantic torch torchvision opencv-python-headless numpy pillow`.
- [ ] Add dev dependencies:
      `uv add --dev pytest ruff`.
- [ ] Create `shared/__init__.py` (empty).

**Verify:** `uv run python -c "import fastapi, torch, cv2; print('ok')"` prints `ok`.

### T0.3 — Build shared module
- [ ] Create `shared/device.py` with `get_device()` function (MPS / CUDA / CPU selection).
- [ ] Create `shared/utils.py` with `decode_image()`, `encode_image()`, `draw_detections()`.
- [ ] Create `shared/model_registry.py` with `ModelEntry` dataclass, `REGISTRY` dict, `register()` decorator.

**Verify:** `uv run python -c "from shared.device import get_device; print(get_device())"` prints `mps`, `cuda`, or `cpu`.

---

## Phase 1 — Backend (Lesson 01)

### T1.1 — Create lesson skeleton
- [ ] Create `lessons/lesson-01-cv-fundamentals/`:
      `backend/__init__.py`, `frontend/`, `assets/`, `README.md`, `lesson.config.json`.
- [ ] Write `lesson.config.json` matching the schema in `architecture.md`.
- [ ] Write `README.md` with placeholder tutorial content (we'll fill it later — just headings).
- [ ] Add 2 sample images to `assets/` (any free CC0 photos work — a cat and a street scene).

**Verify:** `cat lesson.config.json | python -m json.tool` outputs without error.

### T1.2 — FastAPI app skeleton
- [ ] Create `backend/main.py` with FastAPI instance, CORS middleware for `http://localhost:5173`.
- [ ] Add `GET /lesson` returning contents of `lesson.config.json`.
- [ ] Add `GET /tutorial` returning the `README.md` as a string.
- [ ] Add `GET /health` returning `{"status": "ok"}`.

**Verify:** Run `uv run uvicorn lessons.lesson-01-cv-fundamentals.backend.main:app --reload --port 8000`, hit `http://localhost:8000/health`, see `{"status":"ok"}`.

### T1.3 — Models endpoint
- [ ] In `backend/main.py`, import `shared.model_registry.REGISTRY`.
- [ ] Add `GET /models` returning a list of `{name, display_name, param_schema}` from the registry.
- [ ] Create `backend/models_lesson01.py` registering 2 models:
      `opencv_blur` (params: kernel_size 1–31) and
      `opencv_edge` (params: low_threshold 0–255, high_threshold 0–255 — Canny).
- [ ] Import `backend.models_lesson01` from `main.py` so models register at startup.

**Verify:** `curl localhost:8000/models` returns 2 entries with correct schemas.

### T1.4 — Playground inference endpoint
- [ ] Define `InferRequest` and `InferResponse` Pydantic models in `backend/main.py`.
- [ ] Add `POST /playground/infer`:
      decode image → look up model in REGISTRY → call `infer_fn` → encode result → return.
- [ ] Time the inference; include `inference_ms` in the response.

**Verify:** POST a base64-encoded test image to `/playground/infer` with `model_name=opencv_blur`. Response includes annotated image and `inference_ms`.

### T1.5 — Exercises endpoints
- [ ] Create `backend/exercises/` folder. Add `ex1_starter.py`, `ex2_starter.py`, `ex3_starter.py`.
- [ ] `ex1` (fill_blank): `gaussian_blur(image, kernel_size)` with TODO comments.
- [ ] `ex2` (scratch): empty `compute_iou(box_a, box_b)` with docstring and visible test cases as comments.
- [ ] `ex3` (tweak): N/A — exercise 3 uses playground, no code file.
- [ ] Create `backend/solutions.py` with reference solutions for ex1 and ex2 (hidden from frontend).
- [ ] Add `GET /exercises` returning list from `lesson.config.json`.
- [ ] Add `GET /exercises/{id}` returning the starter file content + exercise metadata.

**Verify:** `curl localhost:8000/exercises` returns 3 exercises. `curl localhost:8000/exercises/ex1` includes the starter code.

### T1.6 — Exercise run endpoint
- [ ] Add `POST /exercises/{id}/run`.
- [ ] Write submitted code to `/tmp/cv-learning/exercise-{id}-{uuid}.py`.
- [ ] Execute with `subprocess.run([sys.executable, tmpfile], timeout=30, capture_output=True)`.
- [ ] Return `{stdout, stderr, exit_code, duration_ms}`. Delete temp file.

**Verify:** POST `{"code": "print('hello')"}` to `/exercises/ex1/run`. Response has `stdout: "hello\n"`, `exit_code: 0`.

### T1.7 — Test runner endpoint (SSE)
- [ ] Create `backend/tests.py` with `test_gaussian_blur_shape`, `test_gaussian_blur_blurred`, `test_iou_identical`, `test_iou_disjoint`, `test_iou_partial`.
- [ ] Add `POST /exercises/{id}/test` returning `EventSourceResponse`.
- [ ] Write submitted code to `backend/.work/exercise_{id}.py`.
- [ ] Run `pytest backend/tests.py -k "test_{id_target}" -v --tb=short` via `subprocess.Popen`, stream stdout line-by-line as SSE events.
- [ ] Send final event `{"type": "done", "passed": [...], "failed": [...]}`.

**Verify:** Use `curl -N localhost:8000/exercises/ex1/test -X POST -H "Content-Type: application/json" -d '{"code":"..."}'` with a known-good submission. See streamed PASSED lines.

### T1.8 — Progress endpoints
- [ ] Initialize `shared/progress.json` with empty `{"lessons": {}}` if missing.
- [ ] Add `GET /progress` returning the full file.
- [ ] Add `POST /progress` accepting a partial update; deep-merge with existing JSON; write back atomically (write to tmp file, then rename).

**Verify:** POST `{"lessons": {"lesson-01": {"started_at": "2026-05-19T08:00:00Z"}}}`. GET shows the merged result.

---

## Phase 2 — Frontend (Lesson 01)

### T2.1 — Vite + React scaffold
- [ ] Inside `lesson-01/frontend/`, run `npm create vite@latest . -- --template react`.
- [ ] Install deps: `npm install`.
- [ ] Install additional packages:
      `npm install axios @tanstack/react-query zustand react-markdown rehype-highlight remark-gfm @monaco-editor/react`.
- [ ] Install Tailwind: `npm install -D tailwindcss postcss autoprefixer` then `npx tailwindcss init -p`.
- [ ] Configure `tailwind.config.js` content paths. Add Tailwind directives to `src/index.css`.
- [ ] Add `.nvmrc` with `20`.

**Verify:** `npm run dev` starts on port 5173 and shows the default Vite page.

### T2.2 — API client + global stores
- [ ] Create `src/api.js` with axios instance baseURL `http://localhost:8000`.
- [ ] Export functions: `getLesson`, `getModels`, `getTutorial`, `infer`, `getExercises`, `getExercise`, `runExercise`, `getProgress`, `updateProgress`.
- [ ] Create `src/store/lessonStore.js` (Zustand): `activeTab`, `setActiveTab`, `activeExerciseId`, `setActiveExerciseId`, `exerciseCode` (map), `setExerciseCode`.
- [ ] Persist `exerciseCode` to `localStorage` via Zustand `persist` middleware.

**Verify:** Import `api` in App.jsx; `api.getLesson()` resolves with the lesson config.

### T2.3 — App shell with tabs
- [ ] Replace `App.jsx` with: `<QueryClientProvider>` wrapper, top bar component, tab bar component, panel router.
- [ ] Create `components/TopBar.jsx` showing lesson title + 12-dot roadmap progress.
- [ ] Create `components/TabBar.jsx` with 4 tabs (Tutorial, Playground, Exercises, Progress); active tab from Zustand.
- [ ] Create empty panel components: `panels/Tutorial.jsx`, `Playground.jsx`, `Exercises.jsx`, `Progress.jsx`.

**Verify:** App loads, shows top bar with lesson title, all 4 tabs clickable, active tab changes.

### T2.4 — Tutorial panel
- [ ] In `panels/Tutorial.jsx`: fetch `/tutorial` content via React Query.
- [ ] Render markdown with `react-markdown` + `rehype-highlight` + `remark-gfm`.
- [ ] Show estimated read time (word count / 200) at the top.
- [ ] Add "Next → Playground" button at the bottom that calls `setActiveTab('playground')`.
- [ ] Create `widgets/ConvolutionDemo.jsx` placeholder (kernel slider + small canvas).
- [ ] Wire react-markdown `components` map to render `<ConvolutionDemo />` inside markdown.

**Verify:** Tutorial tab shows the README content. Embedded `<ConvolutionDemo />` renders as a real React widget, not as text.

### T2.5 — Playground panel
- [ ] Left column: image upload input (`<input type=file accept=image/*>`), webcam toggle.
- [ ] Model dropdown populated from `/models`.
- [ ] When model selected, render param sliders dynamically from `param_schema`.
- [ ] "Run" button: encode image to base64, POST to `/playground/infer`, display result.
- [ ] Right column: `<canvas>` showing annotated image at native resolution, scaled to fit.
- [ ] Metadata footer: detections count, inference_ms, model name.

**Verify:** Upload a sample image → select `opencv_blur` → drag kernel_size slider → click Run → blurred image appears on canvas.

### T2.6 — Exercises panel
- [ ] Top: exercise navigator pills (1 / 2 / 3) with type badges.
- [ ] Body for type A/B: Monaco editor (`@monaco-editor/react`) with Python language, fetch starter code from `/exercises/{id}`.
- [ ] Body for type C: parameter sliders + reflection textarea + self-check list.
- [ ] Buttons: "Run tests" (calls `/exercises/{id}/test` via EventSource for SSE), "Hint" (reveals one hint), "Show solution" (with confirmation).
- [ ] Test output area: live-streamed lines, color-coded green for PASSED, red for FAILED.
- [ ] Persist code edits to Zustand (debounced 300 ms).

**Verify:** Open exercise 1, edit code in Monaco, click "Run tests", see streamed pytest output line-by-line, final pass/fail summary.

### T2.7 — Progress panel
- [ ] Fetch `/progress` via React Query.
- [ ] Show two progress bars: auto tests (passed/total) and self-checks (ticked/total).
- [ ] Render global self-check checklist + per-exercise self-checks for type C.
- [ ] Each tick POSTs to `/progress` (debounced 500 ms) and invalidates the React Query cache.
- [ ] "Mark lesson complete" button — disabled until both bars at 100%.

**Verify:** Tick a self-check, reload page, tick persists. Pass an exercise via the test runner, see auto-tests progress bar update.

---

## Phase 3 — Glue & Polish

### T3.1 — One-command startup script
- [ ] Create `lessons/lesson-01-cv-fundamentals/start.sh` per the spec in architecture.md.
- [ ] `chmod +x start.sh`.
- [ ] Test on both target platforms (Mac and Ubuntu).

**Verify:** From a clean checkout, `./start.sh` starts both servers and the browser opens to `http://localhost:5173` with the lesson loaded.

### T3.2 — Tutorial content for lesson-01
- [ ] Write full tutorial in `README.md`:
      "What is an image?" (tensor shapes) →
      "OpenCV basics" (read, display, convert color) →
      "Convolutions" (with embedded ConvolutionDemo widget) →
      "Edge detection" (Canny).
- [ ] Add inline code examples that compile.
- [ ] Add 2 interactive concept widgets: `ConvolutionDemo`, `KernelVisualizer`.

**Verify:** Tutorial reads end-to-end as a cohesive 15-minute intro.

### T3.3 — Exercise content for lesson-01
- [ ] ex1 starter: `gaussian_blur(image, kernel_size)` with 2 TODOs.
- [ ] ex2 starter: empty `compute_iou(box_a, box_b)` with docstring.
- [ ] ex3 setup: tweak Canny low/high thresholds in playground; reflect.
- [ ] Solutions in `backend/solutions.py`.
- [ ] Tests in `backend/tests.py` — 2 tests per exercise (5 total — ex3 has no auto tests).
- [ ] Hints: 2 hints per coding exercise, stored in `lesson.config.json`.

**Verify:** Reference solution passes all tests. Empty starter fails all tests with clear error messages.

### T3.4 — Lesson scaffolding script
- [ ] Create `scripts/new_lesson.sh <slug>` that copies lesson-01 as a template into `lessons/<slug>/`.
- [ ] Replace lesson id and title placeholders.
- [ ] Print "Next steps" instructions to the terminal.

**Verify:** `./scripts/new_lesson.sh lesson-02-classification` creates a working skeleton.

### T3.5 — Docs and final cleanup
- [ ] Update root `README.md` with: prerequisites (uv, node 20), how to start, how to add a lesson, where to find docs.
- [ ] Run `ruff format` and `ruff check --fix` across the repo.
- [ ] Run `npm run lint` in the frontend.
- [ ] Commit with `feat: pilot lesson-01 complete`.

**Verify:** A fresh `git clone` + `./lessons/lesson-01-cv-fundamentals/start.sh` produces a fully working pilot lesson.

---

## Phase 4 — Acceptance Test

Run through this checklist end-to-end on both Mac and Ubuntu:

- [ ] Clone repo, run `./lessons/lesson-01-cv-fundamentals/start.sh`.
- [ ] Browser opens, lesson loads, Tutorial tab visible.
- [ ] Read tutorial top to bottom; ConvolutionDemo widget responds to slider.
- [ ] Switch to Playground; upload a sample image; run `opencv_blur` with different kernel sizes.
- [ ] Switch to Exercises; complete ex1 (fill in the blank); tests pass.
- [ ] Complete ex2 (scratch); tests pass.
- [ ] Complete ex3 (tweak): adjust params, tick all 3 self-checks, write reflection.
- [ ] Switch to Progress; see both bars at 100%.
- [ ] Click "Mark lesson complete"; verify `progress.json` updated.
- [ ] Reload page; verify all state persists (code in Monaco, ticks, progress).

If all of the above passes, the pilot is done. Apply the same template to lesson-02
using `scripts/new_lesson.sh`.

---

## Order of Operations

Build strictly in this order. Don't start a phase until the previous is verified.

```
Phase 0 → Phase 1 → Phase 2 → Phase 3 → Phase 4
```

Within Phase 1 and Phase 2, tasks can be done in numerical order without deviation.
If you find yourself jumping ahead, stop and complete the earlier task first.
