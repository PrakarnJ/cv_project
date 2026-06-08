import { PALETTE } from '../nodes'

// Draggable list of node types, grouped by category. Drag an item onto the
// canvas to add that node (handled by Canvas.onDrop).
export default function NodePalette() {
  const groups = {}
  PALETTE.forEach((p) => {
    ;(groups[p.category] ||= []).push(p)
  })

  return (
    <div className="h-full overflow-y-auto p-3 space-y-3">
      <div className="text-[11px] text-crt-dim leading-snug">
        Drag a node onto the canvas, then connect the green dots:
        <span className="text-crt-text"> Image → … → Output</span>.
      </div>
      {Object.entries(groups).map(([cat, items]) => (
        <div key={cat}>
          <div className="text-crt-dim text-[10px] uppercase tracking-wide mb-1">{cat}</div>
          <div className="space-y-1">
            {items.map((it) => (
              <div
                key={it.type}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('application/cv-node', it.type)
                  e.dataTransfer.effectAllowed = 'move'
                }}
                className="flex items-center gap-2 px-2 py-1.5 rounded border border-crt-border bg-crt-panel hover:border-crt-accent cursor-grab text-[12px]"
              >
                <span>{it.icon}</span>
                <span>{it.label}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
