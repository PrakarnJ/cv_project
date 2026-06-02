import { useMemo, useRef, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'

import { getModels, infer } from '../api'
import { useWebcam } from '../hooks/useWebcam'

function defaultsFor(schema) {
  if (!schema) return {}
  return Object.fromEntries(
    Object.entries(schema).map(([key, def]) => [key, def.default]),
  )
}

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error)
    reader.onload = () => {
      const url = String(reader.result)
      resolve(url.split(',')[1])
    }
    reader.readAsDataURL(file)
  })
}

function ParamSlider({ name, def, value, onChange }) {
  return (
    <label className="block text-sm">
      <span className="flex justify-between text-slate-700">
        <span>{name}</span>
        <span className="font-mono text-slate-500">{value}</span>
      </span>
      <input
        type="range"
        min={def.min}
        max={def.max}
        step={def.type === 'int' ? 1 : 'any'}
        value={value}
        onChange={(e) =>
          onChange(def.type === 'int' ? Number(e.target.value) : parseFloat(e.target.value))
        }
        className="w-full"
        aria-label={name}
      />
    </label>
  )
}

export default function Playground() {
  const { data: models = [] } = useQuery({ queryKey: ['models'], queryFn: getModels })

  // User's explicit picks; null means "use the first model / its defaults".
  // Deriving during render replaces the old default-setting useEffect.
  const [pickedModelName, setPickedModelName] = useState(null)
  const [pickedParams, setPickedParams] = useState(null)

  const modelName = pickedModelName ?? models[0]?.name ?? ''
  const selectedModel = useMemo(
    () => models.find((m) => m.name === modelName),
    [models, modelName],
  )
  const params = pickedParams ?? defaultsFor(selectedModel?.param_schema)

  function chooseModel(name) {
    setPickedModelName(name)
    const next = models.find((m) => m.name === name)
    setPickedParams(defaultsFor(next?.param_schema))
  }

  // Image source: either uploaded file or captured webcam frame.
  const [imageBase64, setImageBase64] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const {
    videoRef,
    active: webcamActive,
    error: webcamError,
    start: startWebcam,
    stop: stopWebcam,
    capture: captureWebcam,
  } = useWebcam()

  async function onFileChange(event) {
    const file = event.target.files?.[0]
    if (!file) return
    const b64 = await readFileAsBase64(file)
    setImageBase64(b64)
    setPreviewUrl(`data:${file.type};base64,${b64}`)
    if (webcamActive) stopWebcam()
  }

  function snapWebcam() {
    const b64 = captureWebcam()
    if (b64) {
      setImageBase64(b64)
      setPreviewUrl(`data:image/png;base64,${b64}`)
    }
  }

  // Inference call and result drawing.
  const canvasRef = useRef(null)
  const inferMutation = useMutation({
    mutationFn: (payload) => infer(payload),
    onSuccess: (data) => {
      drawAnnotated(data.annotated_image_base64)
    },
  })

  function drawAnnotated(b64) {
    const canvas = canvasRef.current
    if (!canvas) return
    const img = new Image()
    img.onload = () => {
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d')
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0)
    }
    img.src = `data:image/png;base64,${b64}`
  }

  function onRun() {
    if (!imageBase64 || !modelName) return
    inferMutation.mutate({
      model_name: modelName,
      params,
      image_base64: imageBase64,
    })
  }

  const result = inferMutation.data
  const runDisabled = !imageBase64 || !modelName || inferMutation.isPending

  return (
    <section className="flex gap-6">
      {/* Left column: controls */}
      <aside className="w-72 shrink-0 space-y-4">
        <div>
          <h3 className="mb-2 text-sm font-medium text-slate-700">Input</h3>
          <input
            type="file"
            accept="image/*"
            onChange={onFileChange}
            className="block w-full text-sm text-slate-600 file:mr-2 file:rounded file:border-0 file:bg-slate-200 file:px-3 file:py-1.5 file:text-sm file:text-slate-800 hover:file:bg-slate-300"
          />
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={webcamActive ? stopWebcam : startWebcam}
              className="rounded border border-slate-300 px-3 py-1 text-sm text-slate-700 hover:bg-slate-100"
            >
              {webcamActive ? 'Stop webcam' : 'Use webcam'}
            </button>
            <button
              type="button"
              onClick={snapWebcam}
              disabled={!webcamActive}
              className="rounded border border-slate-300 px-3 py-1 text-sm text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-400"
            >
              Snap
            </button>
          </div>
          {webcamError && (
            <p className="mt-1 text-xs text-red-600">{webcamError}</p>
          )}
          <video
            ref={videoRef}
            className={
              'mt-2 w-full rounded border border-slate-300 ' +
              (webcamActive ? '' : 'hidden')
            }
            muted
            playsInline
          />
          {previewUrl && !webcamActive && (
            <img
              src={previewUrl}
              alt="Selected input"
              className="mt-2 w-full rounded border border-slate-300"
            />
          )}
        </div>

        <div>
          <h3 className="mb-2 text-sm font-medium text-slate-700">Model</h3>
          <select
            value={modelName}
            onChange={(e) => chooseModel(e.target.value)}
            className="w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-sm"
            aria-label="Model"
          >
            {models.map((m) => (
              <option key={m.name} value={m.name}>
                {m.display_name}
              </option>
            ))}
          </select>
        </div>

        {selectedModel && (
          <div>
            <h3 className="mb-2 text-sm font-medium text-slate-700">Parameters</h3>
            <div className="space-y-3">
              {Object.entries(selectedModel.param_schema).map(([key, def]) => (
                <ParamSlider
                  key={key}
                  name={key}
                  def={def}
                  value={params[key] ?? def.default}
                  onChange={(v) => setPickedParams({ ...params, [key]: v })}
                />
              ))}
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={onRun}
          disabled={runDisabled}
          className="w-full rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {inferMutation.isPending ? 'Running…' : 'Run ▶'}
        </button>

        {inferMutation.isError && (
          <p className="text-sm text-red-600">
            {inferMutation.error?.response?.data?.detail ??
              inferMutation.error?.message}
          </p>
        )}
      </aside>

      {/* Right column: result */}
      <div className="min-w-0 flex-1">
        <h3 className="mb-2 text-sm font-medium text-slate-700">Result</h3>
        <div className="rounded border border-slate-200 bg-white p-3">
          <canvas
            ref={canvasRef}
            className="max-h-[600px] w-full object-contain"
          />
          {!result && (
            <p className="py-12 text-center text-sm text-slate-400">
              Upload an image (or capture from webcam) and press Run.
            </p>
          )}
        </div>
        {result && (
          <dl className="mt-3 grid grid-cols-3 gap-2 text-sm text-slate-600">
            <div>
              <dt className="text-slate-400">Detections</dt>
              <dd>{result.detections.length}</dd>
            </div>
            <div>
              <dt className="text-slate-400">Inference</dt>
              <dd>{result.inference_ms.toFixed(1)} ms</dd>
            </div>
            <div>
              <dt className="text-slate-400">Model</dt>
              <dd className="font-mono text-xs">{result.model}</dd>
            </div>
          </dl>
        )}
      </div>
    </section>
  )
}
