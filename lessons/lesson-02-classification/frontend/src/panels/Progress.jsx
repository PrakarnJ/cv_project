import { useEffect, useMemo, useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  getExercises,
  getLesson,
  getProgress,
  updateProgress,
} from '../api'

const LESSON_KEY = 'lesson-01'

// Hardcoded expected test totals for the two coding exercises. Once
// hints/test_count metadata lands in lesson.config.json this can be derived.
const EXPECTED_TESTS = { ex1: 2, ex2: 3 }

function Bar({ label, value, total }) {
  const pct = total === 0 ? 0 : Math.round((value / total) * 100)
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm text-slate-600">
        <span>{label}</span>
        <span className="font-mono text-xs text-slate-500">
          {value} / {total} ({pct}%)
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded bg-slate-200">
        <div
          className="h-full rounded bg-blue-600 transition-[width]"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

function useDebouncedUpdater(delay) {
  const queryClient = useQueryClient()
  const mut = useMutation({
    mutationFn: (payload) => updateProgress(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['progress'] }),
  })
  const timerRef = useRef(null)
  const pendingRef = useRef(null)

  function schedule(payload) {
    pendingRef.current = payload
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      if (pendingRef.current) {
        mut.mutate(pendingRef.current)
        pendingRef.current = null
      }
    }, delay)
  }

  useEffect(() => () => clearTimeout(timerRef.current), [])
  return schedule
}

export default function Progress() {
  const { data: lesson } = useQuery({ queryKey: ['lesson'], queryFn: getLesson })
  const { data: exercises = [] } = useQuery({
    queryKey: ['exercises'],
    queryFn: getExercises,
  })
  const { data: progress = { lessons: {} } } = useQuery({
    queryKey: ['progress'],
    queryFn: getProgress,
  })

  const lessonProgress = useMemo(
    () => progress.lessons?.[LESSON_KEY] ?? {},
    [progress],
  )

  // -- Auto-tests bar -----------------------------------------------------
  const autoTotals = useMemo(() => {
    const total = Object.values(EXPECTED_TESTS).reduce((a, b) => a + b, 0)
    let passed = 0
    for (const exId of Object.keys(EXPECTED_TESTS)) {
      const p = lessonProgress.exercises?.[exId]?.tests_passed ?? []
      passed += p.length
    }
    return { passed, total }
  }, [lessonProgress])

  // -- Self-check totals --------------------------------------------------
  const globalChecksFromConfig = useMemo(
    () => lesson?.self_checks_global ?? [],
    [lesson],
  )
  const tweakExercises = useMemo(
    () => exercises.filter((e) => e.type === 'tweak'),
    [exercises],
  )

  // Display values are derived directly from the React Query cache; there
  // is no local mirror. Toggle handlers patch the cache for an instant
  // response and let the debounced mutation flush to disk.
  const globalChecks = useMemo(
    () =>
      globalChecksFromConfig.map(
        (_, i) => lessonProgress.self_checks_global?.[i] ?? false,
      ),
    [globalChecksFromConfig, lessonProgress],
  )
  const exerciseChecks = useMemo(() => {
    const out = {}
    for (const ex of tweakExercises) {
      out[ex.id] = (ex.self_checks ?? []).map(
        (_, i) => lessonProgress.exercises?.[ex.id]?.self_checks?.[i] ?? false,
      )
    }
    return out
  }, [tweakExercises, lessonProgress])

  const selfTotals = useMemo(() => {
    let total = globalChecksFromConfig.length
    let ticked = globalChecks.filter(Boolean).length
    for (const ex of tweakExercises) {
      total += ex.self_checks?.length ?? 0
      ticked += (exerciseChecks[ex.id] ?? []).filter(Boolean).length
    }
    return { ticked, total }
  }, [globalChecksFromConfig, globalChecks, tweakExercises, exerciseChecks])

  const queryClient = useQueryClient()
  const debouncedUpdate = useDebouncedUpdater(500)

  function patchLessonCache(updater) {
    queryClient.setQueryData(['progress'], (prev) => {
      const base = prev ?? { lessons: {} }
      const lessonBase = base.lessons?.[LESSON_KEY] ?? {}
      return {
        ...base,
        lessons: { ...base.lessons, [LESSON_KEY]: updater(lessonBase) },
      }
    })
  }

  function toggleGlobal(i, value) {
    const next = globalChecks.map((c, j) => (j === i ? value : c))
    patchLessonCache((lp) => ({ ...lp, self_checks_global: next }))
    debouncedUpdate({
      lessons: { [LESSON_KEY]: { self_checks_global: next } },
    })
  }

  function toggleExerciseCheck(exId, i, value) {
    const next = (exerciseChecks[exId] ?? []).map((c, j) =>
      j === i ? value : c,
    )
    patchLessonCache((lp) => ({
      ...lp,
      exercises: {
        ...(lp.exercises ?? {}),
        [exId]: { ...((lp.exercises ?? {})[exId] ?? {}), self_checks: next },
      },
    }))
    debouncedUpdate({
      lessons: {
        [LESSON_KEY]: {
          exercises: { [exId]: { self_checks: next } },
        },
      },
    })
  }

  // -- Mark complete ------------------------------------------------------
  const markComplete = useMutation({
    mutationFn: () =>
      updateProgress({
        lessons: { [LESSON_KEY]: { completed_at: new Date().toISOString() } },
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['progress'] }),
  })

  const allTestsPassing =
    autoTotals.total > 0 && autoTotals.passed === autoTotals.total
  const allChecksTicked =
    selfTotals.total > 0 && selfTotals.ticked === selfTotals.total
  const canComplete = allTestsPassing && allChecksTicked

  return (
    <section className="space-y-6">
      <header>
        <h2 className="text-xl font-medium text-slate-900">
          {lesson ? `Lesson 01 — ${lesson.title}` : 'Progress'}
        </h2>
        {lessonProgress.completed_at && (
          <p className="mt-1 text-sm text-green-700">
            Completed {new Date(lessonProgress.completed_at).toLocaleString()}.
          </p>
        )}
      </header>

      <div className="space-y-4 rounded border border-slate-200 bg-white p-4">
        <Bar
          label="Auto tests"
          value={autoTotals.passed}
          total={autoTotals.total}
        />
        <Bar
          label="Self-checks"
          value={selfTotals.ticked}
          total={selfTotals.total}
        />
      </div>

      {globalChecksFromConfig.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-medium text-slate-700">
            Self-check checklist
          </h3>
          <ul className="space-y-2">
            {globalChecksFromConfig.map((label, i) => (
              <li key={i}>
                <label className="inline-flex items-start gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={globalChecks[i] ?? false}
                    onChange={(e) => toggleGlobal(i, e.target.checked)}
                    className="mt-0.5"
                  />
                  <span>{label}</span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      )}

      {tweakExercises.map((ex) => (
        <div key={ex.id}>
          <h3 className="mb-2 text-sm font-medium text-slate-700">
            {ex.title} (self-checks)
          </h3>
          <ul className="space-y-2">
            {(ex.self_checks ?? []).map((label, i) => (
              <li key={i}>
                <label className="inline-flex items-start gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={exerciseChecks[ex.id]?.[i] ?? false}
                    onChange={(e) =>
                      toggleExerciseCheck(ex.id, i, e.target.checked)
                    }
                    className="mt-0.5"
                  />
                  <span>{label}</span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      ))}

      <div>
        <button
          type="button"
          onClick={() => markComplete.mutate()}
          disabled={!canComplete || markComplete.isPending}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          Mark lesson complete →
        </button>
        {!canComplete && (
          <p className="mt-2 text-xs text-slate-500">
            Pass all tests and tick every self-check to enable this.
          </p>
        )}
      </div>
    </section>
  )
}
