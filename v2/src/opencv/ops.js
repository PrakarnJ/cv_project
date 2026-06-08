// ---------------------------------------------------------------------------
// OpenCV operation registry — the single source of truth for every node type.
//
// Each entry co-locates everything a node needs:
//   - label / category / icon : palette + node header
//   - hasInput / isSource / isTerminal : graph wiring rules
//   - params : the UI controls (sliders / selects) AND their defaults
//   - apply(cv, src, params) -> Mat : the live in-browser computation (OpenCV.js)
//   - code(outVar, inVar, params) -> string[] : the exported Python (cv2) lines
//
// To ADD A NODE: add one entry here, then register its React component in
// src/nodes/index.js. That's it — palette, engine, preview, and code export all
// pick it up automatically.
//
// Note on color order: OpenCV.js decodes images as RGBA, while Python's
// cv2.imread decodes as BGR. The `apply` funcs use RGBA constants; the emitted
// `code` uses the BGR equivalents. Results are equivalent for these operations.
// ---------------------------------------------------------------------------

function oddInt(n) {
  let k = Math.max(1, Math.round(Number(n)))
  if (k % 2 === 0) k += 1
  return k
}

// Return a single-channel (gray) Mat. Caller owns the result and must delete it.
function toGray(cv, src) {
  if (src.channels() === 1) return src.clone()
  const gray = new cv.Mat()
  cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY)
  return gray
}

// Return an RGBA Mat (for drawing colored overlays). Caller owns the result.
function toRGBA(cv, src) {
  if (src.channels() === 4) return src.clone()
  const rgba = new cv.Mat()
  cv.cvtColor(src, rgba, src.channels() === 1 ? cv.COLOR_GRAY2RGBA : cv.COLOR_RGB2RGBA)
  return rgba
}

export const OPS = {
  image_source: {
    label: 'Image Source',
    category: 'Input',
    icon: '🖼',
    hasInput: false,
    isSource: true,
    params: [], // image is chosen in the node UI; engine decodes it (see runPipeline)
    // apply is handled specially by the engine (decodes the chosen image to a Mat).
    code: (outVar, _inVar, p) => [
      `${outVar} = cv2.imread(${JSON.stringify(p.filename || 'input.png')})  # BGR uint8 (H, W, 3)`,
    ],
  },

  grayscale: {
    label: 'Grayscale',
    category: 'Color',
    icon: '◐',
    hasInput: true,
    params: [],
    apply: (cv, src) => toGray(cv, src),
    code: (outVar, inVar) => [
      `${outVar} = cv2.cvtColor(${inVar}, cv2.COLOR_BGR2GRAY)`,
    ],
  },

  gaussian_blur: {
    label: 'Gaussian Blur',
    category: 'Filter',
    icon: '∿',
    hasInput: true,
    params: [
      { key: 'ksize', label: 'Kernel size', type: 'slider', min: 1, max: 31, step: 2, default: 5 },
    ],
    apply: (cv, src, p) => {
      const k = oddInt(p.ksize)
      const dst = new cv.Mat()
      cv.GaussianBlur(src, dst, new cv.Size(k, k), 0, 0, cv.BORDER_DEFAULT)
      return dst
    },
    code: (outVar, inVar, p) => {
      const k = oddInt(p.ksize)
      return [`${outVar} = cv2.GaussianBlur(${inVar}, (${k}, ${k}), 0)`]
    },
  },

  threshold: {
    label: 'Threshold',
    category: 'Filter',
    icon: '◧',
    hasInput: true,
    params: [
      { key: 'thresh', label: 'Threshold', type: 'slider', min: 0, max: 255, step: 1, default: 127 },
      {
        key: 'mode',
        label: 'Mode',
        type: 'select',
        options: [
          { value: 'binary', label: 'Binary' },
          { value: 'otsu', label: 'Otsu (auto)' },
        ],
        default: 'binary',
      },
    ],
    apply: (cv, src, p) => {
      const gray = toGray(cv, src)
      const dst = new cv.Mat()
      if (p.mode === 'otsu') {
        cv.threshold(gray, dst, 0, 255, cv.THRESH_BINARY + cv.THRESH_OTSU)
      } else {
        cv.threshold(gray, dst, Number(p.thresh), 255, cv.THRESH_BINARY)
      }
      gray.delete()
      return dst
    },
    code: (outVar, inVar, p) => {
      const lines = [
        `_gray = cv2.cvtColor(${inVar}, cv2.COLOR_BGR2GRAY) if ${inVar}.ndim == 3 else ${inVar}`,
      ]
      if (p.mode === 'otsu') {
        lines.push(`_, ${outVar} = cv2.threshold(_gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)`)
      } else {
        lines.push(`_, ${outVar} = cv2.threshold(_gray, ${Number(p.thresh)}, 255, cv2.THRESH_BINARY)`)
      }
      return lines
    },
  },

  canny: {
    label: 'Canny Edges',
    category: 'Edges',
    icon: '╱',
    hasInput: true,
    params: [
      { key: 'low', label: 'Low threshold', type: 'slider', min: 0, max: 255, step: 1, default: 50 },
      { key: 'high', label: 'High threshold', type: 'slider', min: 0, max: 255, step: 1, default: 150 },
    ],
    apply: (cv, src, p) => {
      const gray = toGray(cv, src)
      const dst = new cv.Mat()
      cv.Canny(gray, dst, Number(p.low), Number(p.high))
      gray.delete()
      return dst
    },
    code: (outVar, inVar, p) => [
      `_gray = cv2.cvtColor(${inVar}, cv2.COLOR_BGR2GRAY) if ${inVar}.ndim == 3 else ${inVar}`,
      `${outVar} = cv2.Canny(_gray, ${Number(p.low)}, ${Number(p.high)})`,
    ],
  },

  morphology: {
    label: 'Morphology',
    category: 'Filter',
    icon: '▦',
    hasInput: true,
    params: [
      {
        key: 'op',
        label: 'Operation',
        type: 'select',
        options: [
          { value: 'erode', label: 'Erode' },
          { value: 'dilate', label: 'Dilate' },
          { value: 'open', label: 'Open' },
          { value: 'close', label: 'Close' },
        ],
        default: 'dilate',
      },
      { key: 'ksize', label: 'Kernel size', type: 'slider', min: 1, max: 31, step: 2, default: 3 },
    ],
    apply: (cv, src, p) => {
      const k = oddInt(p.ksize)
      const kernel = cv.Mat.ones(k, k, cv.CV_8U)
      const dst = new cv.Mat()
      const anchor = new cv.Point(-1, -1)
      if (p.op === 'erode') {
        cv.erode(src, dst, kernel, anchor, 1, cv.BORDER_CONSTANT, cv.morphologyDefaultBorderValue())
      } else if (p.op === 'dilate') {
        cv.dilate(src, dst, kernel, anchor, 1, cv.BORDER_CONSTANT, cv.morphologyDefaultBorderValue())
      } else {
        const t = p.op === 'open' ? cv.MORPH_OPEN : cv.MORPH_CLOSE
        cv.morphologyEx(src, dst, t, kernel)
      }
      kernel.delete()
      return dst
    },
    code: (outVar, inVar, p) => {
      const k = oddInt(p.ksize)
      const kline = `_kernel = np.ones((${k}, ${k}), np.uint8)`
      const map = {
        erode: `${outVar} = cv2.erode(${inVar}, _kernel)`,
        dilate: `${outVar} = cv2.dilate(${inVar}, _kernel)`,
        open: `${outVar} = cv2.morphologyEx(${inVar}, cv2.MORPH_OPEN, _kernel)`,
        close: `${outVar} = cv2.morphologyEx(${inVar}, cv2.MORPH_CLOSE, _kernel)`,
      }
      return [kline, map[p.op] || map.dilate]
    },
  },

  find_contours: {
    label: 'Find Contours',
    category: 'Edges',
    icon: '◌',
    hasInput: true,
    params: [],
    apply: (cv, src, _p) => {
      // Binarize first (contours need a single-channel binary image).
      const gray = toGray(cv, src)
      const bin = new cv.Mat()
      cv.threshold(gray, bin, 0, 255, cv.THRESH_BINARY + cv.THRESH_OTSU)
      const contours = new cv.MatVector()
      const hierarchy = new cv.Mat()
      cv.findContours(bin, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE)
      const dst = toRGBA(cv, src)
      const green = new cv.Scalar(57, 255, 20, 255)
      for (let i = 0; i < contours.size(); i++) {
        cv.drawContours(dst, contours, i, green, 2, cv.LINE_8, hierarchy, 100)
      }
      gray.delete()
      bin.delete()
      contours.delete()
      hierarchy.delete()
      return dst
    },
    code: (outVar, inVar) => [
      `_gray = cv2.cvtColor(${inVar}, cv2.COLOR_BGR2GRAY) if ${inVar}.ndim == 3 else ${inVar}`,
      `_, _bin = cv2.threshold(_gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)`,
      `_contours, _ = cv2.findContours(_bin, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)`,
      `${outVar} = ${inVar}.copy() if ${inVar}.ndim == 3 else cv2.cvtColor(${inVar}, cv2.COLOR_GRAY2BGR)`,
      `cv2.drawContours(${outVar}, _contours, -1, (20, 255, 57), 2)`,
    ],
  },

  output: {
    label: 'Output',
    category: 'Output',
    icon: '🟢',
    hasInput: true,
    isTerminal: true,
    params: [],
    apply: (cv, src) => src.clone(), // pass-through; the node shows the final result
    code: (outVar, inVar) => [
      `${outVar} = ${inVar}`,
      `cv2.imwrite("output.png", ${outVar})`,
    ],
  },
}

export function opLabel(type) {
  return OPS[type]?.label ?? type
}

// Defaults for a node's params, derived from the registry schema.
export function defaultParams(type) {
  const out = {}
  for (const p of OPS[type]?.params ?? []) out[p.key] = p.default
  return out
}
