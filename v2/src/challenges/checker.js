import { OPS } from '../opencv/ops'
import { matCache } from '../engine/cache'
import { loadImageToMat } from '../engine/runPipeline'

function toRGB(cv, src) {
  const dst = new cv.Mat()
  if (src.channels() === 1) cv.cvtColor(src, dst, cv.COLOR_GRAY2RGB)
  else if (src.channels() === 4) cv.cvtColor(src, dst, cv.COLOR_RGBA2RGB)
  else src.copyTo(dst)
  return dst
}

// Mean absolute pixel difference (0 = identical, 255 = opposite) compared in
// COLOR (RGB) space, after matching sizes. Comparing in color (not grayscale) is
// essential — otherwise a color image and its grayscale version would score 0,
// making the "convert to grayscale" challenge impossible to check.
function meanAbsDiff(cv, a, b) {
  const ra = toRGB(cv, a)
  let rb = toRGB(cv, b)
  if (rb.rows !== ra.rows || rb.cols !== ra.cols) {
    const r = new cv.Mat()
    cv.resize(rb, r, new cv.Size(ra.cols, ra.rows))
    rb.delete()
    rb = r
  }
  const diff = new cv.Mat()
  cv.absdiff(ra, rb, diff)
  const m = cv.mean(diff) // per-channel means
  ra.delete()
  rb.delete()
  diff.delete()
  return (m[0] + m[1] + m[2]) / 3
}

// Build the challenge's reference ("solution") pipeline in-browser, starting
// from the same sample image, and return its final Mat. The caller must delete it.
async function runSolution(cv, sample, ops) {
  let cur = await loadImageToMat(cv, sample)
  const temps = [cur]
  for (const step of ops) {
    const spec = OPS[step.type]
    const out = spec.apply(cv, cur, step.params || {})
    temps.push(out)
    cur = out
  }
  const result = cur.clone()
  temps.forEach((t) => {
    try {
      t.delete()
    } catch {
      /* noop */
    }
  })
  return result
}

// Compare the user's Output node against the challenge goal.
// Returns { ok, score, message }.
export async function checkChallenge(cv, nodes, challenge) {
  const outNode = nodes.find((n) => n.type === 'output')
  if (!outNode) {
    return { ok: false, message: 'Add an Output node and connect your pipeline to it.' }
  }
  const out = matCache.get(outNode.id)
  if (!out || (out.isDeleted && out.isDeleted())) {
    return { ok: false, message: 'Output is empty — wire your pipeline into the Output node.' }
  }

  const target = await runSolution(cv, challenge.sample, challenge.solution)
  const score = meanAbsDiff(cv, out, target)
  target.delete()

  const tol = challenge.tolerance ?? 12
  if (score <= tol) {
    return { ok: true, score, message: '✓ Output matches the goal. Nice work!' }
  }
  return {
    ok: false,
    score,
    message: `Not quite — your output differs (score ${score.toFixed(1)}, need ≤ ${tol}). Check your node order and slider values.`,
  }
}
