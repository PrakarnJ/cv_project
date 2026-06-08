import { memo, useRef } from 'react'
import { Handle, Position } from '@xyflow/react'
import { useFlowStore } from '../store/flowStore'
import { useNodePreview } from '../hooks/useNodePreview'

const SAMPLES = [
  { value: '/samples/cat.png', label: 'cat.png', filename: 'cat.png' },
  { value: '/samples/street.png', label: 'street.png', filename: 'street.png' },
]

function ImageSourceNodeImpl({ id, data, selected }) {
  const canvasRef = useRef(null)
  const fileRef = useRef(null)
  const updateNodeData = useFlowStore((s) => s.updateNodeData)
  useNodePreview(id, canvasRef)

  const setSample = (value) => {
    const s = SAMPLES.find((x) => x.value === value)
    updateNodeData(id, { src: value, filename: s ? s.filename : 'input.png' })
  }

  const readFile = (file) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => updateNodeData(id, { src: reader.result, filename: file.name })
    reader.readAsDataURL(file)
  }

  const isUploaded = data.src && data.src.startsWith('data:')

  return (
    <div
      className={`rounded-md border bg-crt-panel text-crt-text shadow-lg w-48 ${
        selected ? 'border-crt-accent' : 'border-crt-border'
      }`}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault()
        readFile(e.dataTransfer.files?.[0])
      }}
    >
      <div className="px-2 py-1 text-[11px] font-semibold border-b border-crt-border flex items-center gap-1">
        <span>🖼</span>
        <span>Image Source</span>
      </div>

      <div className="p-2">
        <canvas
          ref={canvasRef}
          className="bg-black rounded-sm block"
          // Fixed display size — see note in OpNode (keeps node dimensions stable).
          style={{ width: 176, height: 120, objectFit: 'contain' }}
        />

        <select
          value={isUploaded ? '' : data.src}
          onChange={(e) => setSample(e.target.value)}
          className="w-full bg-crt-bg border border-crt-border text-crt-text text-[11px] p-1 mt-2 nodrag"
        >
          {isUploaded && <option value="">{data.filename} (uploaded)</option>}
          {SAMPLES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>

        <button
          onClick={() => fileRef.current?.click()}
          className="w-full mt-1 text-[10px] border border-crt-border hover:border-crt-accent text-crt-dim hover:text-crt-text py-1 nodrag"
        >
          Upload / drop an image
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => readFile(e.target.files?.[0])}
        />
      </div>

      <Handle type="source" position={Position.Right} />
    </div>
  )
}

export const ImageSourceNode = memo(ImageSourceNodeImpl)
