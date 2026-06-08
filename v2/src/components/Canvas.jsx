import { useCallback } from 'react'
import { ReactFlow, Background, Controls, useReactFlow } from '@xyflow/react'
import { useFlowStore } from '../store/flowStore'
import { nodeTypes } from '../nodes'

// The React Flow canvas, wired to the zustand graph store. Accepts nodes dropped
// from the palette and renders live-previewing nodes.
export default function Canvas() {
  const nodes = useFlowStore((s) => s.nodes)
  const edges = useFlowStore((s) => s.edges)
  const onNodesChange = useFlowStore((s) => s.onNodesChange)
  const onEdgesChange = useFlowStore((s) => s.onEdgesChange)
  const onConnect = useFlowStore((s) => s.onConnect)
  const addNode = useFlowStore((s) => s.addNode)
  const { screenToFlowPosition } = useReactFlow()

  const onDrop = useCallback(
    (e) => {
      e.preventDefault()
      const type = e.dataTransfer.getData('application/cv-node')
      if (!type) return
      const position = screenToFlowPosition({ x: e.clientX, y: e.clientY })
      addNode(type, position)
    },
    [screenToFlowPosition, addNode]
  )

  return (
    <div
      className="w-full h-full"
      onDrop={onDrop}
      onDragOver={(e) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
      }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        deleteKeyCode={['Backspace', 'Delete']}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#1f2a1f" gap={18} />
        <Controls />
      </ReactFlow>
    </div>
  )
}
