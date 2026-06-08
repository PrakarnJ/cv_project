import { memo, useRef } from 'react'
import { Handle, Position } from '@xyflow/react'
import { OPS } from '../opencv/ops'
import { useFlowStore } from '../store/flowStore'
import { useNodePreview } from '../hooks/useNodePreview'

function ParamControl({ nodeId, param, value }) {
  const updateNodeParam = useFlowStore((s) => s.updateNodeParam)

  if (param.type === 'slider') {
    return (
      <label className="block text-[10px] text-crt-dim mt-1">
        <span className="flex justify-between">
          <span>{param.label}</span>
          <span className="text-crt-text">{value}</span>
        </span>
        <input
          type="range"
          min={param.min}
          max={param.max}
          step={param.step}
          value={value}
          onChange={(e) => updateNodeParam(nodeId, param.key, Number(e.target.value))}
          className="w-full accent-crt-accent nodrag"
        />
      </label>
    )
  }

  if (param.type === 'select') {
    return (
      <label className="block text-[10px] text-crt-dim mt-1">
        {param.label}
        <select
          value={value}
          onChange={(e) => updateNodeParam(nodeId, param.key, e.target.value)}
          className="w-full bg-crt-bg border border-crt-border text-crt-text text-[11px] p-1 mt-0.5 nodrag"
        >
          {param.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
    )
  }
  return null
}

function OpNodeImpl({ id, type, data, selected }) {
  const spec = OPS[type]
  const canvasRef = useRef(null)
  const error = useFlowStore((s) => s.errors[id])
  useNodePreview(id, canvasRef)

  const params = data.params || {}
  const previewMax = spec.isTerminal ? 200 : 120

  return (
    <div
      className={`rounded-md border bg-crt-panel text-crt-text shadow-lg w-48 ${
        selected ? 'border-crt-accent' : 'border-crt-border'
      }`}
    >
      {spec.hasInput && <Handle type="target" position={Position.Left} />}

      <div className="px-2 py-1 text-[11px] font-semibold border-b border-crt-border flex items-center gap-1">
        <span>{spec.icon}</span>
        <span>{spec.label}</span>
      </div>

      <div className="p-2">
        <canvas
          ref={canvasRef}
          className="bg-black rounded-sm block"
          // Fixed display size so painting an image never changes the node's
          // measured dimensions (which would make React Flow re-measure in a loop).
          style={{ width: 176, height: previewMax, objectFit: 'contain' }}
        />
        {error && <div className="text-[10px] text-crt-amber mt-1">⚠ {error}</div>}
        {(spec.params || []).map((p) => (
          <ParamControl key={p.key} nodeId={id} param={p} value={params[p.key]} />
        ))}
      </div>

      {!spec.isTerminal && <Handle type="source" position={Position.Right} />}
    </div>
  )
}

export const OpNode = memo(OpNodeImpl)
