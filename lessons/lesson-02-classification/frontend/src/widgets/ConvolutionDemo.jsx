import { useEffect, useRef, useState } from 'react'

const SIZE = 80

function generateInput(ctx) {
  const img = ctx.createImageData(SIZE, SIZE)
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const i = (y * SIZE + x) * 4
      const v = ((x + y) % 16 < 8 ? 30 : 220) + Math.floor(Math.random() * 10)
      img.data[i] = v
      img.data[i + 1] = v
      img.data[i + 2] = v
      img.data[i + 3] = 255
    }
  }
  return img
}

function boxBlur(src, k) {
  const r = Math.floor(k / 2)
  const dst = new Uint8ClampedArray(src.data.length)
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      let acc = 0
      let n = 0
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const yy = Math.min(SIZE - 1, Math.max(0, y + dy))
          const xx = Math.min(SIZE - 1, Math.max(0, x + dx))
          acc += src.data[(yy * SIZE + xx) * 4]
          n++
        }
      }
      const v = acc / n
      const i = (y * SIZE + x) * 4
      dst[i] = v
      dst[i + 1] = v
      dst[i + 2] = v
      dst[i + 3] = 255
    }
  }
  return new ImageData(dst, SIZE, SIZE)
}

export default function ConvolutionDemo() {
  const [kernel, setKernel] = useState(3)
  const inputRef = useRef(null)
  const outputRef = useRef(null)
  const sourceRef = useRef(null)

  useEffect(() => {
    if (!inputRef.current || !outputRef.current) return
    const inCtx = inputRef.current.getContext('2d')
    sourceRef.current = generateInput(inCtx)
    inCtx.putImageData(sourceRef.current, 0, 0)
  }, [])

  useEffect(() => {
    if (!outputRef.current || !sourceRef.current) return
    const outCtx = outputRef.current.getContext('2d')
    outCtx.putImageData(boxBlur(sourceRef.current, kernel), 0, 0)
  }, [kernel])

  return (
    <div className="not-prose my-4 rounded border border-crt-border bg-crt-surface p-4 glow-box">
      <div className="mb-3 flex items-center gap-3">
        <label className="text-sm font-medium text-crt-text">
          Kernel size: {kernel}
        </label>
        <input
          type="range"
          min={1}
          max={11}
          step={2}
          value={kernel}
          onChange={(e) => setKernel(Number(e.target.value))}
          className="flex-1 accent-crt-text"
          aria-label="Kernel size"
        />
      </div>
      <div className="flex items-start gap-4">
        <figure>
          <canvas
            ref={inputRef}
            width={SIZE}
            height={SIZE}
            className="border border-crt-border [image-rendering:pixelated]"
          />
          <figcaption className="mt-1 text-center text-xs text-crt-muted">
            input
          </figcaption>
        </figure>
        <figure>
          <canvas
            ref={outputRef}
            width={SIZE}
            height={SIZE}
            className="border border-crt-border [image-rendering:pixelated]"
          />
          <figcaption className="mt-1 text-center text-xs text-crt-muted">
            blurred
          </figcaption>
        </figure>
      </div>
    </div>
  )
}
