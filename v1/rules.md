# Rules — Claude Code Working Agreement

These rules apply to every Claude Code session in this repository. Re-read before
starting a new task.

---

## General Principles

1. **One change at a time.** Don't refactor unrelated files in the same task.
2. **Read before you write.** View existing files before editing them.
3. **Match the existing style.** Don't introduce new patterns if an old one works.
4. **No silent dependencies.** Every new package must be added to `pyproject.toml` or `package.json` explicitly.
5. **Do not break working features.** Run existing tests before considering a task done.
6. **Ask before assuming.** If the request is ambiguous, ask one clarifying question.

---

## Python Rules

### Tooling
- Use `uv` for everything. Never `pip install` directly.
- Add deps with `uv add <package>`. For dev-only: `uv add --dev <package>`.
- Run commands inside the env via `uv run <cmd>` — never activate venv manually.
- Python version pinned in `.python-version` to `3.11`.

### Style
- Format with `ruff format`. Lint with `ruff check --fix`. No black, no flake8.
- Type hints required on all public functions. Internal helpers may skip if obvious.
- Use `from __future__ import annotations` at the top of every module.
- Imports sorted: stdlib → third-party → local. Blank line between groups.

### Patterns
- Prefer `pathlib.Path` over `os.path`.
- Prefer f-strings over `.format()` or `%`.
- Use `pydantic.BaseModel` for all API request/response schemas, never raw dicts.
- Async only when there's actual I/O concurrency — don't `async def` for show.
- One module = one responsibility. If a file passes 300 lines, split it.

### Tests
- All tests in `backend/tests.py` (per-lesson) or `tests/` (shared).
- Use plain `pytest` — no unittest, no nose.
- Test names start with `test_`. Test files start with `test_`.
- Mock external services. Don't hit real network in tests.
- Fixtures in `conftest.py`, not duplicated across files.

### Forbidden
- `print()` for debugging in committed code — use `logging` or remove.
- Bare `except:` clauses — always catch specific exceptions.
- `os.system()` or `os.popen()` — use `subprocess.run()` with a list of args.
- Mutable default arguments (`def foo(x=[])`).
- Global state outside `shared/model_registry.py` (which is the one exception).

---

## JavaScript / React Rules

### Tooling
- Vite for dev server and build. No Webpack, no Create React App.
- `npm` is the package manager (not yarn / pnpm) — keep it consistent.
- Node version pinned in `frontend/.nvmrc` to `20`.

### Style
- Format with Prettier defaults. Lint with ESLint (vite-react preset).
- Functional components only. No class components.
- Use hooks for all stateful logic. No HOCs.
- `.jsx` extension for files containing JSX.

### Patterns
- API calls go through `src/api.js` — never `fetch()` or `axios` directly in components.
- Server state in React Query. Local UI state in Zustand. Component state in `useState`.
- Tailwind classes only. No inline `style={{}}` except for dynamic values that can't be Tailwind.
- One component per file. File name = component name.
- Hooks named `useX`. Stores named `xStore`.

### Forbidden
- `useEffect` for derived state — compute during render.
- `dangerouslySetInnerHTML` except inside the tutorial markdown renderer.
- Direct DOM manipulation (`document.querySelector`) except inside canvas widgets.
- Storing large objects in Zustand — keep stores < 1 KB.
- Adding a UI library (MUI, Chakra, etc.) — Tailwind only.

---

## API Design Rules

- All routes prefixed by purpose: `/playground/...`, `/exercises/...`, `/progress`.
- Use HTTP verbs correctly: GET for reads, POST for writes/actions, DELETE for removal.
- Always return JSON, never plain text (except SSE streams).
- Always include `inference_ms` or `duration_ms` for any operation > 100 ms.
- Pydantic models named `XxxRequest` / `XxxResponse`.
- Error responses use FastAPI's `HTTPException` with a clear `detail` string.
- CORS allowed origins: only `http://localhost:5173`. Never `*`.

---

## File Organization Rules

- A new lesson is created via `./scripts/new_lesson.sh <name>` — never by hand.
- Cross-lesson code goes in `shared/`. Lesson-specific code stays in the lesson folder.
- Sample images / videos in `lessons/<lesson>/assets/`. No assets in `frontend/public/`.
- Generated files (temp code, work dirs) go in `lessons/<lesson>/.work/`. Gitignored.
- No `node_modules` or `__pycache__` committed.

---

## Model Registry Rules

- Every model registered with the `@register(...)` decorator from `shared/model_registry.py`.
- `param_schema` must be JSON-serializable and complete — no hidden params.
- `infer_fn` signature: `(image: np.ndarray, params: dict) -> dict`.
- Return dict must include keys: `image` (np.ndarray) and `detections` (list[dict]).
- Models that need weights download them on first use into `~/.cache/cv-learning/`. Never commit weights.
- Each lesson registers its own models at import time. Importing the lesson backend = registry populated.

---

## Security Rules

- This is a localhost-only dev tool. Do not add auth, do not expose to network.
- Code execution sandbox uses `subprocess.run(..., timeout=30)`. Never `shell=True`.
- Temp files for code execution: under `/tmp/cv-learning/`, deleted after run.
- Never log full request bodies — they may contain large base64 images.

---

## Performance Rules

- Don't reload models on every request. Cache in `model_registry.py` after first load.
- Don't send raw numpy arrays over HTTP — always base64-encoded JPEG/PNG.
- Frontend: don't re-fetch progress on every keystroke. Debounce 500 ms.
- Monaco editor: don't sync code state on every keystroke either. Debounce 300 ms before localStorage write.

---

## Commit / Branch Rules

- Conventional commits: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`.
- One logical change per commit. Don't bundle unrelated fixes.
- No commit messages like "wip", "stuff", "asdf".
- Never commit secrets, model weights, sample data > 1 MB, or `.work/` directories.

---

## When Stuck

If a task is ambiguous, missing info, or appears to conflict with these rules:
- **Stop.** Don't guess.
- **Ask one specific question** — show the user what's ambiguous.
- **Propose a default.** Offer the most likely interpretation and ask for confirmation.

Example: "The PRD says exercises auto-grade, but exercise type C uses self-check.
Should type C show a 'Run tests' button at all? Default: hide it for type C."

---

## Forbidden Phrases / Patterns

- "I'll just quickly add..." — no quick additions, follow the task list.
- "We can always refactor later" — refactor now or don't add it.
- "It should work" — verify it works before saying done.
- "I'm not sure if this is right but..." — ask first.
