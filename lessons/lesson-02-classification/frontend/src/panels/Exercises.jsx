import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Editor from '@monaco-editor/react'

import {
  getExercise,
  getExercises,
  getSolution,
  streamTests,
  updateProgress,
} from '../api'
import { useLessonStore } from '../store/lessonStore'

const TYPE_LABEL = { fill_blank: 'A', scratch: 'B', tweak: 'C' }

function TypeBadge({ type }) {
  return (
    <span className="ml-1 rounded bg-slate-200 px-1.5 py-0.5 font-mono text-[10px] uppercase text-slate-600">
      {TYPE_LABEL[type] ?? '?'}
    </span>
  )
}

function ConfirmModal({ title, body, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-96 rounded bg-white p-5 shadow-xl">
        <h3 className="text-base font-medium text-slate-900">{title}</h3>
        <p className="mt-2 text-sm text-slate-600">{body}</p>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded border border-slate-300 px-3 py-1 text-sm text-slate-700 hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded bg-red-600 px-3 py-1 text-sm font-medium text-white hover:bg-red-700"
          >
            Show me
          </button>
        </div>
      </div>
    </div>
  )
}

function TestOutput({ lines, summary, running }) {
  return (
    <pre className="mt-3 max-h-72 overflow-auto rounded bg-slate-900 p-3 font-mono text-xs leading-relaxed text-slate-100">
      {lines.length === 0 && !running && (
        <span className="text-slate-500">Press Run tests to see output.</span>
      )}
      {lines.map((line, i) => {
        let color = 'text-slate-200'
        if (line.includes(' PASSED')) color = 'text-green-400'
        else if (line.includes(' FAILED')) color = 'text-red-400'
        else if (line.startsWith('=')) color = 'text-slate-400'
        return (
          <div key={i} className={color}>
            {line || ' '}
          </div>
        )
      })}
      {summary && (
        <div className="mt-2 border-t border-slate-700 pt-2 text-slate-300">
          {summary.passed.length} passed · {summary.failed.length} failed
        </div>
      )}
      {running && <div className="mt-2 text-slate-400">Running…</div>}
    </pre>
  )
}

function CodeExercise({ exercise }) {
  const exerciseCode = useLessonStore((s) => s.exerciseCode)
  const setExerciseCode = useLessonStore((s) => s.setExerciseCode)
  const queryClient = useQueryClient()
  const persistProgress = useMutation({
    mutationFn: (payload) => updateProgress(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['progress'] }),
  })

  // Local buffer for the editor; debounce-flush into the store so we don't
  // hammer localStorage on every keystroke. The parent remounts this
  // component on exercise change (via key={exercise.id}), so initial state
  // is recomputed from the freshly-loaded starter without a sync effect.
  const persisted = exerciseCode[exercise.id]
  const [draft, setDraft] = useState(persisted ?? exercise.starter_code ?? '')

  useEffect(() => {
    const handle = setTimeout(() => setExerciseCode(exercise.id, draft), 300)
    return () => clearTimeout(handle)
  }, [draft, exercise.id, setExerciseCode])

  // SSE state
  const [lines, setLines] = useState([])
  const [summary, setSummary] = useState(null)
  const [running, setRunning] = useState(false)
  const [streamError, setStreamError] = useState(null)
  const abortRef = useRef(null)

  async function runTests() {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setLines([])
    setSummary(null)
    setStreamError(null)
    setRunning(true)
    try {
      await streamTests(exercise.id, draft, {
        signal: controller.signal,
        onLine: (line) => setLines((prev) => [...prev, line]),
        onDone: (done) => {
          setSummary(done)
          persistProgress.mutate({
            lessons: {
              'lesson-01': {
                exercises: {
                  [exercise.id]: {
                    tests_passed: done.passed,
                    tests_failed: done.failed,
                    last_code: draft,
                  },
                },
              },
            },
          })
        },
      })
    } catch (err) {
      if (err.name !== 'AbortError') setStreamError(err.message || String(err))
    } finally {
      setRunning(false)
    }
  }

  // Hint / solution UI
  const [hintIdx, setHintIdx] = useState(-1)
  const hints = exercise.hints ?? []
  const [showSolutionModal, setShowSolutionModal] = useState(false)
  const solutionQuery = useQuery({
    queryKey: ['solution', exercise.id],
    queryFn: () => getSolution(exercise.id),
    enabled: false, // only fetch after the modal is confirmed
  })

  return (
    <>
      <div className="mb-2 rounded border border-slate-200 bg-white">
        <Editor
          height="420px"
          language="python"
          value={draft}
          onChange={(v) => setDraft(v ?? '')}
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            scrollBeyondLastLine: false,
            tabSize: 4,
            insertSpaces: true,
            automaticLayout: true,
          }}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={runTests}
          disabled={running}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-slate-300"
        >
          {running ? 'Running…' : 'Run tests ▶'}
        </button>
        <button
          type="button"
          onClick={() =>
            setHintIdx((i) => (hints.length === 0 ? -1 : Math.min(i + 1, hints.length - 1)))
          }
          className="rounded border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
        >
          Hint
        </button>
        <button
          type="button"
          onClick={() => setShowSolutionModal(true)}
          className="rounded border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
        >
          Show solution
        </button>
      </div>

      {hintIdx >= 0 && (
        <p className="mt-2 rounded bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {hints.length === 0
            ? 'No hints available for this exercise.'
            : `Hint ${hintIdx + 1}/${hints.length}: ${hints[hintIdx]}`}
        </p>
      )}

      {solutionQuery.data && (
        <pre className="hljs mt-2 max-h-72 overflow-auto rounded bg-slate-900 p-3 font-mono text-xs text-slate-100">
          <code className="language-python">{solutionQuery.data.code}</code>
        </pre>
      )}
      {solutionQuery.isError && (
        <p className="mt-2 text-sm text-red-600">
          {solutionQuery.error?.response?.data?.detail ??
            solutionQuery.error?.message ??
            'Failed to load solution'}
        </p>
      )}

      {streamError && (
        <p className="mt-2 text-sm text-red-600">{streamError}</p>
      )}

      <TestOutput lines={lines} summary={summary} running={running} />

      {showSolutionModal && (
        <ConfirmModal
          title="Reveal reference solution?"
          body="Try it yourself first — looking at the solution short-circuits the learning."
          onConfirm={() => {
            solutionQuery.refetch()
            setShowSolutionModal(false)
          }}
          onCancel={() => setShowSolutionModal(false)}
        />
      )}
    </>
  )
}

function TweakExercise({ exercise }) {
  const setActiveTab = useLessonStore((s) => s.setActiveTab)
  const [reflection, setReflection] = useState('')
  const [checks, setChecks] = useState(
    () => Array(exercise.self_checks?.length ?? 0).fill(false),
  )
  return (
    <section className="space-y-4">
      <p className="text-sm text-slate-600">
        This exercise is exploratory — work in the{' '}
        <button
          type="button"
          onClick={() => setActiveTab('playground')}
          className="font-medium text-blue-600 hover:underline"
        >
          Playground
        </button>{' '}
        with model{' '}
        <code className="rounded bg-slate-100 px-1 font-mono text-xs text-slate-700">
          {exercise.playground_model}
        </code>{' '}
        and reflect below.
      </p>

      {exercise.self_checks && (
        <ul className="space-y-2">
          {exercise.self_checks.map((label, i) => (
            <li key={i}>
              <label className="inline-flex items-start gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={checks[i]}
                  onChange={(e) =>
                    setChecks((prev) => prev.map((c, j) => (j === i ? e.target.checked : c)))
                  }
                  className="mt-0.5"
                />
                <span>{label}</span>
              </label>
            </li>
          ))}
        </ul>
      )}

      <label className="block text-sm">
        <span className="text-slate-700">Reflection</span>
        <textarea
          value={reflection}
          onChange={(e) => setReflection(e.target.value)}
          rows={4}
          className="mt-1 w-full rounded border border-slate-300 p-2 text-sm"
          placeholder="One sentence on what surprised you, or what you learned…"
        />
      </label>

      <p className="text-xs text-slate-400">
        Self-check + reflection persistence is wired through the Progress tab (T2.7).
      </p>
    </section>
  )
}

export default function Exercises() {
  const { data: list = [] } = useQuery({
    queryKey: ['exercises'],
    queryFn: getExercises,
  })

  const activeId = useLessonStore((s) => s.activeExerciseId)
  const setActiveId = useLessonStore((s) => s.setActiveExerciseId)

  // Ensure activeId is one of the listed exercises once they load.
  useEffect(() => {
    if (list.length > 0 && !list.some((e) => e.id === activeId)) {
      setActiveId(list[0].id)
    }
  }, [list, activeId, setActiveId])

  const { data: exercise } = useQuery({
    queryKey: ['exercise', activeId],
    queryFn: () => getExercise(activeId),
    enabled: Boolean(activeId),
  })

  const idx = useMemo(
    () => Math.max(0, list.findIndex((e) => e.id === activeId)),
    [list, activeId],
  )

  return (
    <section>
      {/* Navigator pills */}
      <ol className="mb-4 flex items-center gap-2 text-sm">
        {list.map((e, i) => {
          const active = e.id === activeId
          return (
            <li key={e.id}>
              <button
                type="button"
                onClick={() => setActiveId(e.id)}
                className={
                  'inline-flex items-center rounded-full border px-3 py-1 ' +
                  (active
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : 'border-slate-300 text-slate-600 hover:bg-slate-100')
                }
              >
                Exercise {i + 1}
                <TypeBadge type={e.type} />
              </button>
            </li>
          )
        })}
      </ol>

      {exercise && (
        <>
          <h2 className="mb-1 text-xl font-medium text-slate-900">
            {idx + 1} of {list.length}: {exercise.title}
          </h2>
          <p className="mb-4 text-sm text-slate-500">
            Type {TYPE_LABEL[exercise.type]} ·{' '}
            {exercise.type === 'fill_blank' && 'Fill in the blanks.'}
            {exercise.type === 'scratch' && 'Implement from scratch.'}
            {exercise.type === 'tweak' && 'Tweak and observe.'}
          </p>

          {exercise.type === 'tweak' ? (
            <TweakExercise key={exercise.id} exercise={exercise} />
          ) : (
            <CodeExercise key={exercise.id} exercise={exercise} />
          )}
        </>
      )}
    </section>
  )
}
