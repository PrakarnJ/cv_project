import { create } from 'zustand'
import { applyNodeChanges, applyEdgeChanges, addEdge } from '@xyflow/react'
import { OPS, defaultParams } from '../opencv/ops'

let idCounter = 1
export function nextId(type) {
  return `${type}_${idCounter++}`
}

export function makeNode(type, position, extraData = {}) {
  const data = { label: OPS[type]?.label ?? type, params: defaultParams(type) }
  // A fresh Image Source starts on a bundled sample so the canvas is never blank.
  if (type === 'image_source') {
    data.src = '/samples/cat.png'
    data.filename = 'cat.png'
  }
  Object.assign(data, extraData)
  return { id: nextId(type), type, position, data }
}

export const useFlowStore = create((set, get) => ({
  nodes: [],
  edges: [],
  runVersion: 0, // bumped after each pipeline run to refresh node previews
  errors: {}, // nodeId -> error message from the last run

  // --- React Flow controlled handlers ---
  onNodesChange: (changes) => set({ nodes: applyNodeChanges(changes, get().nodes) }),
  onEdgesChange: (changes) => set({ edges: applyEdgeChanges(changes, get().edges) }),
  onConnect: (conn) =>
    set({ edges: addEdge({ ...conn, animated: true }, get().edges) }),

  // --- graph mutation ---
  addNode: (type, position, extraData) =>
    set({ nodes: [...get().nodes, makeNode(type, position, extraData)] }),

  setGraph: (nodes, edges) => set({ nodes, edges, errors: {} }),
  clearGraph: () => set({ nodes: [], edges: [], errors: {} }),

  updateNodeData: (id, patch) =>
    set({
      nodes: get().nodes.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, ...patch } } : n
      ),
    }),

  updateNodeParam: (id, key, value) =>
    set({
      nodes: get().nodes.map((n) =>
        n.id === id
          ? { ...n, data: { ...n.data, params: { ...n.data.params, [key]: value } } }
          : n
      ),
    }),

  // --- run bookkeeping ---
  bumpRun: (errors = {}) => set((s) => ({ runVersion: s.runVersion + 1, errors })),
}))

// Dev-only: expose the store for debugging and smoke tests.
if (typeof window !== 'undefined' && import.meta.env?.DEV) {
  window.__cvflow = useFlowStore
  window.__cvmake = makeNode
}
