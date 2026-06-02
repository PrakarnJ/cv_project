import { useMemo, useState } from 'react'

// Placeholder concept widget — renders a 1-D Gaussian kernel as a row of cells
// whose opacity reflects the weight. Helps explain why neighbours nearer the
// centre contribute more than those at the edges.
function gaussianWeights(k, sigma) {
  const r = Math.floor(k / 2)
  const weights = []
  for (let i = -r; i <= r; i++) {
    weights.push(Math.exp(-(i * i) / (2 * sigma * sigma)))
  }
  const sum = weights.reduce((a, b) => a + b, 0)
  return weights.map((w) => w / sum)
}

export default function KernelVisualizer() {
  const [size, setSize] = useState(7)
  const [sigma, setSigma] = useState(1.5)
  const weights = useMemo(() => gaussianWeights(size, sigma), [size, sigma])
  return (
    <div className="not-prose my-4 rounded border border-slate-200 bg-slate-50 p-4">
      <div className="mb-3 grid grid-cols-2 gap-3">
        <label className="text-sm text-slate-700">
          Kernel size: {size}
          <input
            type="range"
            min={3}
            max={15}
            step={2}
            value={size}
            onChange={(e) => setSize(Number(e.target.value))}
            className="w-full"
          />
        </label>
        <label className="text-sm text-slate-700">
          Sigma: {sigma.toFixed(2)}
          <input
            type="range"
            min={0.5}
            max={4}
            step={0.1}
            value={sigma}
            onChange={(e) => setSigma(Number(e.target.value))}
            className="w-full"
          />
        </label>
      </div>
      <div className="flex justify-center gap-1">
        {weights.map((w, i) => (
          <div key={i} className="flex flex-col items-center">
            <div
              className="h-10 w-10 rounded border border-slate-300 bg-blue-600"
              style={{ opacity: w / Math.max(...weights) }}
              title={w.toFixed(3)}
            />
            <span className="mt-1 font-mono text-xs text-slate-500">
              {w.toFixed(2)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
