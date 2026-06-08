import { useState, useEffect } from 'react'
import { ReactFlowProvider } from '@xyflow/react'
import Canvas from './components/Canvas'
import NodePalette from './components/NodePalette'
import ChallengePanel from './components/ChallengePanel'
import ExportModal from './components/ExportModal'
import { useImageProcessor } from './hooks/useImageProcessor'
import { useOpenCV } from './opencv/OpenCVContext'
import { useFlowStore, makeNode } from './store/flowStore'

function StatusDot() {
  const { ready, error } = useOpenCV()
  const color = error ? 'bg-crt-red' : ready ? 'bg-crt-accent' : 'bg-crt-amber'
  const label = error ? 'OpenCV failed' : ready ? 'OpenCV ready' : 'Loading OpenCV…'
  return (
    <span className="flex items-center gap-1.5 text-[11px] text-crt-dim" title={error || label}>
      <span className={`w-2 h-2 rounded-full ${color} ${!ready && !error ? 'animate-pulse' : ''}`} />
      {label}
    </span>
  )
}

export default function App() {
  const [tab, setTab] = useState('sandbox')
  const [exportOpen, setExportOpen] = useState(false)
  const clearGraph = useFlowStore((s) => s.clearGraph)
  const setGraph = useFlowStore((s) => s.setGraph)

  // Drives all live previews — one instance for the whole app.
  useImageProcessor()

  const seedSandbox = () => {
    const img = makeNode('image_source', { x: 40, y: 120 })
    const out = makeNode('output', { x: 520, y: 120 })
    setGraph([img, out], [])
  }

  // Start with a non-empty board so the canvas is never blank on first load.
  useEffect(() => {
    if (useFlowStore.getState().nodes.length === 0) seedSandbox()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <ReactFlowProvider>
      <div className="h-screen flex flex-col bg-crt-bg text-crt-text">
        {/* Header */}
        <header className="flex items-center gap-4 px-4 py-2 border-b border-crt-border">
          <span className="font-bold text-crt-accent">CV&nbsp;Lab</span>
          <span className="text-[10px] text-crt-dim border border-crt-border rounded px-1">v2</span>

          <div className="flex rounded border border-crt-border overflow-hidden text-[12px]">
            {['sandbox', 'challenges'].map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-3 py-1 capitalize ${
                  tab === t ? 'bg-crt-accent text-crt-bg' : 'text-crt-dim hover:text-crt-text'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="flex-1" />
          <StatusDot />
          <button
            onClick={seedSandbox}
            className="text-[12px] px-2 py-1 border border-crt-border text-crt-dim hover:text-crt-text rounded"
          >
            New board
          </button>
          <button
            onClick={clearGraph}
            className="text-[12px] px-2 py-1 border border-crt-border text-crt-dim hover:text-crt-text rounded"
          >
            Clear
          </button>
          <button
            onClick={() => setExportOpen(true)}
            className="text-[12px] px-2 py-1 border border-crt-accent text-crt-accent hover:bg-crt-accent hover:text-crt-bg rounded"
          >
            ⬇ Export Python
          </button>
        </header>

        {/* Body */}
        <div className="flex-1 flex min-h-0">
          <aside className="w-52 border-r border-crt-border shrink-0">
            <NodePalette />
          </aside>

          <main className="flex-1 min-w-0">
            <Canvas />
          </main>

          {tab === 'challenges' && (
            <aside className="w-72 border-l border-crt-border shrink-0">
              <ChallengePanel />
            </aside>
          )}
        </div>

        <ExportModal open={exportOpen} onClose={() => setExportOpen(false)} />
      </div>
    </ReactFlowProvider>
  )
}
