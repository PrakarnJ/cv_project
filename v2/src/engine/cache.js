// OpenCV.js Mats are WASM-heap objects that must be explicitly .delete()'d, so
// we keep them OUT of React state and in these module-level caches instead.

// nodeId -> Mat : every node's output for the current run. Recomputed (and the
// old Mats freed) on each pipeline run.
export const matCache = new Map()

// imageKey (url or dataURL) -> Mat : decoded source images. Persistent across
// runs so we don't re-decode a PNG every time a slider moves.
export const sourceMatCache = new Map()

export function clearMatCache() {
  for (const m of matCache.values()) {
    try {
      m.delete()
    } catch {
      /* already freed */
    }
  }
  matCache.clear()
}
