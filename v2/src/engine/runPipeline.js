import { OPS } from '../opencv/ops'
import { topoSort } from './graph'
import { matCache, sourceMatCache, clearMatCache } from './cache'

// Decode an image URL/dataURL into an RGBA OpenCV.js Mat via an offscreen canvas.
export function loadImageToMat(cv, src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = img.naturalWidth
        canvas.height = img.naturalHeight
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0)
        resolve(cv.imread(canvas)) // RGBA Mat
      } catch (e) {
        reject(e)
      }
    }
    img.onerror = () => reject(new Error('Failed to load image: ' + src))
    img.src = src
  })
}

// Execute the whole graph in topological order. Each node's output Mat lands in
// matCache keyed by node id; nodes read it back to paint their live preview.
// Returns { errors: { [nodeId]: message } } for nodes that failed.
export async function runPipeline(cv, nodes, edges) {
  clearMatCache()
  const nodeById = new Map(nodes.map((n) => [n.id, n]))
  const { order, inputOf } = topoSort(nodes, edges)
  const errors = {}

  for (const id of order) {
    const node = nodeById.get(id)
    const spec = node && OPS[node.type]
    if (!spec) continue

    try {
      if (spec.isSource) {
        const key = node.data?.src
        if (!key) continue
        let srcMat = sourceMatCache.get(key)
        if (!srcMat) {
          srcMat = await loadImageToMat(cv, key)
          sourceMatCache.set(key, srcMat)
        }
        matCache.set(id, srcMat.clone()) // clone so clearMatCache can free uniformly
      } else {
        const inId = inputOf.get(id)
        const inMat = inId ? matCache.get(inId) : null
        if (!inMat) {
          errors[id] = 'Not connected to an input'
          continue
        }
        matCache.set(id, spec.apply(cv, inMat, node.data?.params || {}))
      }
    } catch (e) {
      errors[id] = e?.message || String(e)
    }
  }

  return { errors }
}
