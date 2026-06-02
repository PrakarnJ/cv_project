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
    <span className="ml-1 rounded border border-crt-border bg-crt-dim px-1.5 py-0.5 font-mono text-[10px] uppercase text-crt-muted">
      {TYPE_LABEL[type] ?? '?'}
    </span>
  )
}

function ConfirmModal({ title, body, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-96 rounded border border-crt-border bg-crt-surface p-5 glow-box">
        <h3 className="text-base font-medium text-crt-text">{title}</h3>
        <p className="mt-2 text-sm text-crt-muted">{body}</p>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded border border-crt-border px-3 py-1 text-sm text-crt-muted transition-colors hover:bg-crt-dim"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded border border-red-700 px-3 py-1 text-sm font-medium text-red-400 transition-colors hover:bg-red-900/30"
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
    <pre className="mt-3 max-h-72 overflow-auto rounded border border-crt-border bg-crt-bg p-3 font-mono text-xs leading-relaxed text-crt-muted">
      {lines.length === 0 && !running && (
        <span className="text-crt-border">Press Run tests to see output.</span>
      )}
      {lines.map((line, i) => {
        let color = 'text-crt-muted'
        if (line.includes(' PASSED')) color = 'text-crt-text glow'
        else if (line.includes(' FAILED')) color = 'text-red-400'
        else if (line.startsWith('=')) color = 'text-crt-border'
        return (
          <div key={i} className={color}>
            {line || ' '}
          </div>
        )
      })}
      {summary && (
        <div className="mt-2 border-t border-crt-border pt-2 text-crt-muted">
          {summary.passed.length} passed · {summary.failed.length} failed
        </div>
      )}
      {running && <div className="mt-2 text-crt-muted">Running…</div>}
    </pre>
  )
}

function crtBeforeMount(monaco) {
  monaco.editor.defineTheme('crt-green', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment',         foreground: '4a9e5a', fontStyle: 'italic' },
      { token: 'keyword',         foreground: '80ff9a', fontStyle: 'bold' },
      { token: 'string',          foreground: '66cc77' },
      { token: 'string.escape',   foreground: '80ff9a' },
      { token: 'number',          foreground: '80ff9a' },
      { token: 'type.identifier', foreground: '33ff57' },
      { token: 'delimiter',       foreground: '2d6a3a' },
      { token: 'operator',        foreground: '4a9e5a' },
    ],
    colors: {
      'editor.background':                   '#0f1a0f',
      'editor.foreground':                   '#33ff57',
      'editor.lineHighlightBackground':      '#141f14',
      'editor.selectionBackground':          '#1a3a1a',
      'editorCursor.foreground':             '#33ff57',
      'editorLineNumber.foreground':         '#2d6a3a',
      'editorLineNumber.activeForeground':   '#4a9e5a',
      'editor.selectionHighlightBackground': '#1a3a1a80',
      'editorIndentGuide.background1':       '#1a3a1a',
      'scrollbarSlider.background':          '#1a3a1a80',
      'scrollbarSlider.hoverBackground':     '#2d6a3a80',
      'editorWidget.background':             '#0f1a0f',
      'editorWidget.border':                 '#1a3a1a',
      'input.background':                    '#0a0f0a',
      'input.foreground':                    '#33ff57',
      'input.border':                        '#1a3a1a',
    },
  })
}

function CodeExercise({ exercise }) {
  const exerciseCode = useLessonStore((s) => s.exerciseCode)
  const setExerciseCode = useLessonStore((s) => s.setExerciseCode)
  const queryClient = useQueryClient()
  const persistProgress = useMutation({
    mutationFn: (payload) => updateProgress(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['progress'] }),
  })

  const persisted = exerciseCode[exercise.id]
  const [draft, setDraft] = useState(persisted ?? exercise.starter_code ?? '')

  useEffect(() => {
    const handle = setTimeout(() => setExerciseCode(exercise.id, draft), 300)
    return () => clearTimeout(handle)
  }, [draft, exercise.id, setExerciseCode])

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
              'lesson-02': {
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

  const [hintIdx, setHintIdx] = useState(-1)
  const hints = exercise.hints ?? []
  const [showSolutionModal, setShowSolutionModal] = useState(false)
  const solutionQuery = useQuery({
    queryKey: ['solution', exercise.id],
    queryFn: () => getSolution(exercise.id),
    enabled: false,
  })

  return (
    <>
      <div className="mb-2 rounded border border-crt-border glow-box">
        <Editor
          height="420px"
          language="python"
          theme="crt-green"
          value={draft}
          onChange={(v) => setDraft(v ?? '')}
          beforeMount={crtBeforeMount}
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            fontFamily: '"Share Tech Mono", "Courier New", monospace',
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
          className="rounded bg-crt-accent px-4 py-2 text-sm font-medium text-crt-text hover:bg-crt-accent-hover disabled:bg-crt-dim disabled:text-crt-disabled disabled:opacity-60"
        >
          {running ? 'Running…' : 'Run tests ▶'}
        </button>
        <button
          type="button"
          onClick={() =>
            setHintIdx((i) => (hints.length === 0 ? -1 : Math.min(i + 1, hints.length - 1)))
          }
          className="rounded border border-crt-border px-3 py-2 text-sm text-crt-muted transition-colors hover:bg-crt-dim"
        >
          Hint
        </button>
        <button
          type="button"
          onClick={() => setShowSolutionModal(true)}
          className="rounded border border-crt-border px-3 py-2 text-sm text-crt-muted transition-colors hover:bg-crt-dim"
        >
          Show solution
        </button>
      </div>

      {hintIdx >= 0 && (
        <p className="mt-2 rounded border border-crt-text bg-crt-surface px-3 py-2 text-sm text-crt-muted">
          {hints.length === 0
            ? 'No hints available for this exercise.'
            : `Hint ${hintIdx + 1}/${hints.length}: ${hints[hintIdx]}`}
        </p>
      )}

      {solutionQuery.data && (
        <pre className="hljs mt-2 max-h-72 overflow-auto rounded border border-crt-border bg-crt-bg p-3 font-mono text-xs text-crt-text">
          <code className="language-python">{solutionQuery.data.code}</code>
        </pre>
      )}
      {solutionQuery.isError && (
        <p className="mt-2 text-sm text-red-400">
          {solutionQuery.error?.response?.data?.detail ??
            solutionQuery.error?.message ??
            'Failed to load solution'}
        </p>
      )}

      {streamError && (
        <p className="mt-2 text-sm text-red-400">{streamError}</p>
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
      <p className="text-sm text-crt-muted">
        This exercise is exploratory — work in the{' '}
        <button
          type="button"
          onClick={() => setActiveTab('playground')}
          className="font-medium text-crt-bright hover:underline"
        >
          Playground
        </button>{' '}
        with model{' '}
        <code className="rounded border border-crt-border bg-crt-surface px-1 font-mono text-xs text-crt-text">
          {exercise.playground_model}
        </code>{' '}
        and reflect below.
      </p>

      {exercise.self_checks && (
        <ul className="space-y-2">
          {exercise.self_checks.map((label, i) => (
            <li key={i}>
              <label className="inline-flex items-start gap-2 text-sm text-crt-text">
                <input
                  type="checkbox"
                  checked={checks[i]}
                  onChange={(e) =>
                    setChecks((prev) => prev.map((c, j) => (j === i ? e.target.checked : c)))
                  }
                  className="mt-0.5 accent-crt-text"
                />
                <span>{label}</span>
              </label>
            </li>
          ))}
        </ul>
      )}

      <label className="block text-sm">
        <span className="text-crt-text">Reflection</span>
        <textarea
          value={reflection}
          onChange={(e) => setReflection(e.target.value)}
          rows={4}
          className="mt-1 w-full rounded border border-crt-border bg-crt-bg p-2 text-sm text-crt-text placeholder-crt-muted focus:border-crt-text focus:outline-none"
          placeholder="One sentence on what surprised you, or what you learned…"
        />
      </label>

      <p className="text-xs text-crt-muted">
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
      <ol className="mb-4 flex items-center gap-2 text-sm">
        {list.map((e, i) => {
          const active = e.id === activeId
          return (
            <li key={e.id}>
              <button
                type="button"
                onClick={() => setActiveId(e.id)}
                className={
                  'inline-flex items-center rounded-full border px-3 py-1 transition-colors ' +
                  (active
                    ? 'border-crt-text bg-crt-dim text-crt-text glow'
                    : 'border-crt-border text-crt-muted hover:bg-crt-dim')
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
          <h2 className="mb-1 text-xl font-medium text-crt-text glow">
            {idx + 1} of {list.length}: {exercise.title}
          </h2>
          <p className="mb-4 text-sm text-crt-muted">
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
