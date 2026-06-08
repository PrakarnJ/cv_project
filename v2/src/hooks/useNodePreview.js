import { useEffect } from 'react'
import { useOpenCV } from '../opencv/OpenCVContext'
import { useFlowStore } from '../store/flowStore'
import { matCache } from '../engine/cache'

// Paints a node's cached output Mat onto its preview canvas. Re-fires whenever a
// pipeline run finishes (runVersion bump). cv.imshow sizes the canvas backing
// store to the image; CSS scales it down to thumbnail size.
export function useNodePreview(nodeId, canvasRef) {
  const { cv, ready } = useOpenCV()
  const runVersion = useFlowStore((s) => s.runVersion)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!ready || !cv || !canvas) return
    const mat = matCache.get(nodeId)
    if (mat && !(mat.isDeleted && mat.isDeleted())) {
      try {
        cv.imshow(canvas, mat)
        return
      } catch {
        /* fall through to clear */
      }
    }
    const ctx = canvas.getContext('2d')
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height)
  }, [cv, ready, runVersion, nodeId, canvasRef])
}
