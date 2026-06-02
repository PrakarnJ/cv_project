# Design Document — CV Learning Platform

## Design Philosophy

- **Learn by doing first** — the playground and exercises are the primary UI, not the tutorial.
- **One screen per mode** — Tutorial / Playground / Exercises / Progress; never mix concerns on the same panel.
- **Zero friction to start** — no login, no setup wizard, no onboarding modal.
- **Code is the product** — the Monaco editor is a first-class UI element.

---

## Global Layout

```
┌─────────────────────────────────────────────────────────┐
│ cv-learning   Lesson 01: CV Fundamentals    ●●○○○○○○○○ │
├─────────────────────────────────────────────────────────┤
│ [Tutorial] [Playground] [Exercises] [Progress]          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│                 < active panel content >                │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

- Top bar: lesson title (left) + roadmap dot progress (right).
- Tab bar: 4 fixed tabs, always visible, current tab highlighted.
- Main area: single scrollable panel per tab.
- No sidebar — full width content.

---

## Tab 1: Tutorial

```
┌─────────────────────────────────────────────────────────┐
│ # CV Fundamentals             • 8 min read              │
│                                                         │
│ Images are just tensors of shape (C, H, W)...           │
│                                                         │
│ [syntax-highlighted code block]                         │
│                                                         │
│ ┌─── Interactive demo ────────────────────┐             │
│ │  Kernel size  ──●──  5                  │             │
│ │  [convolution preview canvas]           │             │
│ └─────────────────────────────────────────┘             │
│                                                         │
│ [Next → Playground]                                     │
└─────────────────────────────────────────────────────────┘
```

- Rendered from `README.md` via `react-markdown` + `rehype-highlight`.
- Embedded React components (not iframes) for concept demos.
- Estimated read time at the top (words / 200 wpm).
- "Next → Playground" CTA at the bottom.

---

## Tab 2: Playground

```
┌──────────────────┬──────────────────────────────────────┐
│ Input            │ Result                               │
│                  │                                      │
│ [Upload image]   │ ┌────────────────────────────────┐   │
│ [Use webcam]     │ │                                │   │
│                  │ │  annotated image (canvas)      │   │
│ Model            │ │                                │   │
│ [dropdown ▾]     │ └────────────────────────────────┘   │
│                  │                                      │
│ Parameters       │ Detections: 3                        │
│ Confidence ─●─   │ Inference: 124 ms                    │
│ IoU thresh ─●─   │ Model: yolov8n                       │
│                  │                                      │
│ [Run ▶]          │ [Download result]                    │
└──────────────────┴──────────────────────────────────────┘
```

- Left column: input controls, fixed width 280 px.
- Right column: result canvas, flex fill.
- Model dropdown populated from `GET /models`.
- Parameters section is dynamic per model type (registry declares schema).
- Webcam path: browser `getUserMedia` → canvas → POST frame on demand.
- Result canvas: HTML5 `<canvas>` with boxes/masks drawn client-side from JSON.

---

## Tab 3: Exercises

```
┌─────────────────────────────────────────────────────────┐
│ Exercise 1 of 3   [A: Fill in the blank]   ●○○          │
├─────────────────────────────────────────────────────────┤
│ Task: Implement gaussian_blur(image, kernel_size)       │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ def gaussian_blur(image, kernel_size=5):            │ │
│ │     """Apply Gaussian blur to image tensor."""      │ │
│ │     # TODO: create gaussian kernel                  │ │
│ │     kernel = ...                                    │ │
│ │     # TODO: apply convolution                       │ │
│ │     return ...                                      │ │
│ └─────────────────────────────────────────────────────┘ │  ← Monaco
│                                                         │
│ [Run tests ▶]    [Hint]    [Show solution]              │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ ✓ test_output_shape         PASSED                  │ │
│ │ ✗ test_blur_applied         FAILED                  │ │
│ │   AssertionError: expected blurred, got sharp       │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ [← Prev exercise]              [Next exercise →]        │
└─────────────────────────────────────────────────────────┘
```

- Pills navigator at top with type badge (`A` / `B` / `C`).
- Monaco editor: Python syntax, 400 px min height.
- Hint: reveals one hint at a time, collapsed by default.
- "Show solution": confirmation modal first.
- Test output: live SSE stream, line-by-line, color-coded.
- Type C exercises replace the editor with parameter controls + reflection textarea.

---

## Tab 4: Progress

```
┌─────────────────────────────────────────────────────────┐
│ Lesson 01 — CV Fundamentals                             │
│                                                         │
│ Auto tests        ████████░░    4 / 5 passing           │
│ Self-checks       ██████░░░░    3 / 5 ticked            │
│                                                         │
│ Self-check checklist                                    │
│ [✓] I understand how images are tensor shapes (C,H,W)   │
│ [✓] I tried at least 3 kernel sizes in the playground   │
│ [ ] I read the OpenCV docs for cv2.filter2D             │
│ [ ] I observed what happens with kernel_size > 15       │
│                                                         │
│ [Mark lesson complete →]                                │
└─────────────────────────────────────────────────────────┘
```

- Two progress bars: auto-test pass rate + self-check tick rate.
- Self-check checklist saves on each tick (debounced POST to `/progress`).
- "Mark complete" disabled until both bars hit 100%.

---

## Component Map (frontend/src/)

```
App.jsx                  ← root, tab router, lesson state
├── components/
│   ├── TopBar.jsx       ← lesson title + roadmap dots
│   ├── TabBar.jsx       ← 4-tab navigator
│   └── ProgressDots.jsx ← reusable dot indicator
├── panels/
│   ├── Tutorial.jsx     ← react-markdown render of README.md
│   ├── Playground.jsx   ← upload/webcam + model dropdown + canvas
│   ├── Exercises.jsx    ← exercise navigator + Monaco + test output
│   └── Progress.jsx     ← progress bars + checklist
├── widgets/
│   ├── ConvolutionDemo.jsx  ← embedded tutorial widgets
│   └── KernelVisualizer.jsx
├── hooks/
│   ├── useProgress.js   ← read/write progress.json via API
│   ├── useModels.js     ← fetch model registry
│   └── useWebcam.js     ← getUserMedia wrapper
├── store/
│   └── lessonStore.js   ← Zustand: active tab, exercise idx, code
└── api.js               ← axios client for FastAPI
```

---

## Color & Type

- Use Tailwind defaults — slate/blue palette.
- Headings: 22 / 18 / 16 px, weight 500.
- Body: 14–16 px, weight 400, line-height 1.6.
- Code: JetBrains Mono or system mono, 13 px.
- Pass/fail colors: `green-600` / `red-600`. Active tab: `blue-600` underline.

---

## Accessibility

- All interactive elements have `aria-label`.
- Keyboard nav: `Tab` to move focus, `Enter` to activate buttons.
- Monaco supports screen readers natively.

---

## State Management Decisions

| State | Owner | Persisted |
|-------|-------|-----------|
| Active tab | Zustand | No (resets to Tutorial on reload) |
| Exercise code (per exercise) | Zustand + localStorage | Yes (so reloads don't lose work) |
| Self-check ticks | Backend (`progress.json`) | Yes |
| Test results | React Query cache | No (re-run on demand) |
| Model dropdown | React Query cache | No (server-side registry) |

---

## Inline Demo Pattern

Tutorial markdown can embed a React component via custom JSX block:

````markdown
## Convolution Basics

A convolution slides a kernel over an image.

<ConvolutionDemo />

This produces a feature map.
````

`react-markdown` is configured with a `components` map that maps `<ConvolutionDemo />`
to the actual React component import. Adding a new demo = creating a `.jsx` file in
`widgets/` and registering it in the markdown components map.
