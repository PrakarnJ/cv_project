// Shared graph helpers used by both the live runner and the code generator.

// Kahn topological sort. Returns { order: nodeId[], inputOf: Map<target, source> }.
// We assume a single input per node (one upstream edge) — enough for the
// linear-ish image pipelines this tool teaches.
export function topoSort(nodes, edges) {
  const indeg = new Map()
  const adj = new Map()
  const inputOf = new Map()
  nodes.forEach((n) => {
    indeg.set(n.id, 0)
    adj.set(n.id, [])
  })
  edges.forEach((e) => {
    if (!adj.has(e.source) || !indeg.has(e.target)) return
    adj.get(e.source).push(e.target)
    indeg.set(e.target, indeg.get(e.target) + 1)
    inputOf.set(e.target, e.source) // last edge wins if multiple
  })
  const queue = nodes.filter((n) => indeg.get(n.id) === 0).map((n) => n.id)
  const order = []
  while (queue.length) {
    const id = queue.shift()
    order.push(id)
    for (const m of adj.get(id) || []) {
      indeg.set(m, indeg.get(m) - 1)
      if (indeg.get(m) === 0) queue.push(m)
    }
  }
  return { order, inputOf }
}
