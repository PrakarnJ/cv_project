import { OPS } from '../opencv/ops'
import { topoSort } from './graph'

// Turn a node id into a safe Python variable name.
function varName(id) {
  return 'v_' + String(id).replace(/[^a-zA-Z0-9_]/g, '_')
}

// Generate a runnable Python (cv2) script equivalent to the current graph.
// This is the "export to source code" path — the bridge from low-code to code.
export function generatePython(nodes, edges) {
  const nodeById = new Map(nodes.map((n) => [n.id, n]))
  const { order, inputOf } = topoSort(nodes, edges)

  const body = []
  const usesNumpy = nodes.some((n) => n.type === 'morphology')

  for (const id of order) {
    const node = nodeById.get(id)
    const spec = node && OPS[node.type]
    if (!spec) continue

    const outVar = varName(id)
    const inId = inputOf.get(id)
    const inVar = inId ? varName(inId) : null

    if (spec.hasInput && !inVar) {
      body.push(`# (skipped ${spec.label} — not connected to an input)`, '')
      continue
    }

    body.push(`# ${spec.label}`)
    body.push(...spec.code(outVar, inVar, node.data?.params || {}))
    body.push('')
  }

  const header = ['import cv2']
  if (usesNumpy) header.push('import numpy as np')

  if (body.length === 0) {
    return [...header, '', '# Add nodes to the canvas to generate a pipeline.', ''].join('\n')
  }

  return [
    ...header,
    '',
    '# Pipeline exported from CV Lab v2.',
    '# Replace the input filename below and run:  python pipeline.py',
    '',
    ...body,
  ].join('\n')
}
