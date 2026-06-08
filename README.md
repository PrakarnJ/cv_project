# CV Learning Platform

A self-hosted Computer Vision learning project. It now comes in **two flavors** — pick the one
that matches how you want to learn.

## 🟢 v2 — Visual OpenCV (start here if you're new to OpenCV)

A **low-code, drag-and-drop** node editor. Build image pipelines by wiring nodes, see the result
**live** at every step, and **export to Python (cv2)** when you want to expand. Runs entirely in
the browser (OpenCV.js / WebAssembly) — no Python install needed to learn.

```bash
cd v2
npm install
npm run dev      # → http://localhost:5175
```

See [`v2/README.md`](v2/README.md). Includes a free **Sandbox** and a guided **Challenges** track.

## 📘 v1 — Full-stack lessons (the original, code-first platform)

The original platform: each lesson is a standalone **FastAPI + React** app with a tutorial,
a model playground, and code-writing exercises checked by `pytest`. More setup, more depth,
assumes you want to write Python.

```bash
cd v1
./lessons/lesson-01-cv-fundamentals/start.sh    # → backend :8002, frontend :5174
```

See [`v1/README.md`](v1/README.md) and [`v1/prd.md`](v1/prd.md) for the full 12-lesson roadmap.

---

### Which should I use?

| | v2 (Visual) | v1 (Full-stack) |
|---|---|---|
| Style | Drag-and-drop nodes | Write Python in an editor |
| Setup | `npm install` only | `uv` + `npm`, per-lesson servers |
| Runs | In the browser (offline) | Local backend + frontend |
| Best for | Learning OpenCV concepts fast | Going deep, PyTorch/DL lessons |
| Code | Export pipeline → `.py` | You write it |

Both share the same goal: learn CV by doing. v2 is the gentle on-ramp; v1 is the deep dive.
