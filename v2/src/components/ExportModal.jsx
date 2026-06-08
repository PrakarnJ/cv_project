import { useMemo, useState } from 'react'
import { useFlowStore } from '../store/flowStore'
import { generatePython } from '../engine/codegen'

// Shows the current graph as a runnable Python (cv2) script — the "expand to
// source code" path. Copy it out and run it outside the browser.
export default function ExportModal({ open, onClose }) {
  const nodes = useFlowStore((s) => s.nodes)
  const edges = useFlowStore((s) => s.edges)
  const [copied, setCopied] = useState(false)

  const code = useMemo(
    () => (open ? generatePython(nodes, edges) : ''),
    [open, nodes, edges]
  )

  if (!open) return null

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard blocked — user can select manually */
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-crt-panel border border-crt-border rounded-lg w-[640px] max-w-[90vw] max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-2 border-b border-crt-border">
          <span className="text-sm font-semibold">Export pipeline → Python (cv2)</span>
          <button onClick={onClose} className="text-crt-dim hover:text-crt-text">
            ✕
          </button>
        </div>
        <pre className="flex-1 overflow-auto p-4 text-[12px] leading-relaxed text-crt-text whitespace-pre">
          {code}
        </pre>
        <div className="flex items-center justify-end gap-2 px-4 py-2 border-t border-crt-border">
          <button
            onClick={copy}
            className="px-3 py-1 text-[12px] border border-crt-accent text-crt-accent hover:bg-crt-accent hover:text-crt-bg rounded"
          >
            {copied ? 'Copied!' : 'Copy code'}
          </button>
        </div>
      </div>
    </div>
  )
}
