import { useEffect, useRef } from 'react'
import { useOpenCV } from '../opencv/OpenCVContext'
import { useFlowStore } from '../store/flowStore'
import { runPipeline } from '../engine/runPipeline'

// A compact signature of only the things that affect the IMAGE output: each
// node's id/type/params/source and the edges. React Flow also mutates the nodes
// array for cosmetic changes (drag position, measured dimensions) — those must
// NOT trigger a re-run, or the live preview's canvas-resize feeds back into a
// dimension change and the pipeline loops forever.
function graphSignature(nodes, edges) {
  const n = nodes
    .map((x) => `${x.id}:${x.type}:${x.data?.src || ''}:${JSON.stringify(x.data?.params || {})}`)
    .join('|')
  const e = edges.map((x) => `${x.source}->${x.target}`).join(',')
  return n + '#' + e
}

// Mount once (in App). Re-runs the whole pipeline whenever the SEMANTIC graph
// changes, debounced so slider drags stay smooth. Runs are serialized.
export function useImageProcessor() {
  const { cv, ready } = useOpenCV()
  const sig = useFlowStore((s) => graphSignature(s.nodes, s.edges))
  const bumpRun = useFlowStore((s) => s.bumpRun)

  const timer = useRef(null)
  const running = useRef(false)
  const dirty = useRef(false)

  useEffect(() => {
    if (!ready || !cv) return

    const run = async () => {
      if (running.current) {
        dirty.current = true // a newer graph arrived mid-run; run once more after
        return
      }
      running.current = true
      try {
        do {
          dirty.current = false
          const { nodes, edges } = useFlowStore.getState()
          const { errors } = await runPipeline(cv, nodes, edges)
          bumpRun(errors)
        } while (dirty.current)
      } finally {
        running.current = false
      }
    }

    clearTimeout(timer.current)
    timer.current = setTimeout(run, 120)
    return () => clearTimeout(timer.current)
  }, [cv, ready, sig, bumpRun])
}
