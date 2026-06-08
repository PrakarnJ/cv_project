# CV Lab v2 — Visual OpenCV (low-code node editor)

A beginner-friendly, **drag-and-drop** way to learn OpenCV. Build an image pipeline by
wiring nodes (Image → Grayscale → Blur → Edges → Output), watch the result update **live**
at every step, then **export the whole thing to runnable Python (cv2)** when you want to go
deeper.

Everything runs **in your browser** via OpenCV.js (WebAssembly) — no Python needed to learn.
The exported `.py` is what you run/expand outside the app.

> This is **version 2** of the CV learning platform. The original full-stack, code-first
> platform lives in [`../v1`](../v1) and still works — see the repo root `README.md`.

## Run it

```bash
cd v2
npm install        # also vendors OpenCV.js into public/opencv/ (postinstall)
npm run dev
# open http://localhost:5175
```

The ~11MB OpenCV.js WASM bundle is **not** committed to git. It ships as the
`@techstark/opencv-js` devDependency and is copied into `public/opencv/opencv.js`
by `scripts/copy-opencv.mjs`, which runs automatically on `npm install`, `npm run dev`,
and `npm run build` (or on demand via `npm run copy-opencv`). After install the app
serves OpenCV.js locally and runs **offline** — no CDN or runtime download.

## Two ways to learn

- **Sandbox** — an open canvas. Drag any nodes from the left palette, wire the green dots,
  tweak sliders, watch the live preview, and click **⬇ Export Python**.
- **Challenges** — guided goals ("make a black & white mask", "find the edges"). Build the
  pipeline, hit **Check**, and the app compares your Output to the goal. Hints on demand;
  progress saved in your browser.

## How it works

```
Palette ──drag──▶ React Flow canvas ──▶ engine (topological run) ──▶ OpenCV.js (WASM)
                                            │                              │
                                            ▼                              ▼
                                   each node's live preview      Export → Python (cv2)
```

- `src/opencv/ops.js` — the **operation registry**: the single source of truth for every node.
- `src/engine/` — `runPipeline.js` (executes the graph), `codegen.js` (graph → Python), `graph.js`, `cache.js`.
- `src/nodes/` — the React Flow node components (`OpNode` is generic; `ImageSourceNode` is custom).
- `src/components/` — `Canvas`, `NodePalette`, `ExportModal`, `ChallengePanel`.
- `src/challenges/` — `lesson-01.json` (challenge data) + `checker.js` (output comparison).

### Adding a node (the extension pattern)

Add **one entry** to `OPS` in `src/opencv/ops.js`:

```js
my_op: {
  label: 'My Op', category: 'Filter', icon: '★', hasInput: true,
  params: [{ key: 'amount', label: 'Amount', type: 'slider', min: 0, max: 100, default: 10 }],
  apply: (cv, src, p) => { /* return a new cv.Mat */ },
  code: (out, inp, p) => [`${out} = some_cv2_call(${inp}, ${p.amount})`],
},
```

The palette, live preview, graph engine, and Python export all pick it up automatically — no
other file needs to change (unless it needs custom UI like a new input source).

### Adding a lesson

Drop a `src/challenges/lesson-NN.json` with the same shape as `lesson-01.json`
(`{ lesson, intro, challenges: [{ id, title, goal, sample, solution, tolerance, hints }] }`).
The `solution` is the reference pipeline (a list of `{ type, params }`); the checker runs it
in-browser on the same sample and compares your Output (mean-absolute pixel difference).

## Notes

- **Color order:** OpenCV.js decodes images as **RGBA**; Python's `cv2.imread` decodes as
  **BGR**. The live `apply` functions use RGBA constants while the exported code uses the BGR
  equivalents — results are equivalent for these operations.
- **Future (deep learning):** lessons that need PyTorch (detection, segmentation, OCR…) can't
  run in OpenCV.js. The intended extension is a *backend-backed node* that POSTs its input to
  v1's existing FastAPI `model_registry` and emits a model call in the exported code. Not built
  yet — v2 deliberately stays pure client-side for the OpenCV fundamentals.
