import { useState } from 'react'
import lesson from '../challenges/lesson-01.json'
import { useFlowStore, makeNode } from '../store/flowStore'
import { useOpenCV } from '../opencv/OpenCVContext'
import { checkChallenge } from '../challenges/checker'

const DONE_KEY = 'cvlab.v2.completed'
function loadDone() {
  try {
    return new Set(JSON.parse(localStorage.getItem(DONE_KEY) || '[]'))
  } catch {
    return new Set()
  }
}
function saveDone(set) {
  try {
    localStorage.setItem(DONE_KEY, JSON.stringify([...set]))
  } catch {
    /* private mode — progress just won't persist */
  }
}

export default function ChallengePanel() {
  const { cv, ready } = useOpenCV()
  const setGraph = useFlowStore((s) => s.setGraph)
  const [idx, setIdx] = useState(null)
  const [revealed, setRevealed] = useState(0)
  const [result, setResult] = useState(null)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(loadDone)

  const challenge = idx == null ? null : lesson.challenges[idx]

  const loadStarter = (i) => {
    const ch = lesson.challenges[i]
    const img = makeNode('image_source', { x: 40, y: 80 }, {
      src: ch.sample,
      filename: ch.sample.split('/').pop(),
    })
    const out = makeNode('output', { x: 480, y: 80 })
    setGraph([img, out], [])
    setIdx(i)
    setRevealed(0)
    setResult(null)
  }

  const onCheck = async () => {
    if (!ready || !challenge) return
    setBusy(true)
    try {
      const r = await checkChallenge(cv, useFlowStore.getState().nodes, challenge)
      setResult(r)
      if (r.ok) {
        const d = new Set(done)
        d.add(challenge.id)
        setDone(d)
        saveDone(d)
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="h-full overflow-y-auto p-3 space-y-3 text-[12px]">
      <div>
        <div className="font-semibold text-crt-text">{lesson.lesson}</div>
        <div className="text-crt-dim text-[11px] mt-1 leading-snug">{lesson.intro}</div>
        <div className="text-crt-dim text-[11px] mt-1">
          {done.size}/{lesson.challenges.length} complete
        </div>
      </div>

      <div className="space-y-1">
        {lesson.challenges.map((ch, i) => (
          <button
            key={ch.id}
            onClick={() => loadStarter(i)}
            className={`w-full text-left px-2 py-1.5 rounded border flex items-center gap-2 ${
              i === idx ? 'border-crt-accent bg-crt-panel' : 'border-crt-border hover:border-crt-dim'
            }`}
          >
            <span className={done.has(ch.id) ? 'text-crt-accent' : 'text-crt-dim'}>
              {done.has(ch.id) ? '✓' : '○'}
            </span>
            <span>{ch.title}</span>
          </button>
        ))}
      </div>

      {challenge && (
        <div className="border-t border-crt-border pt-3 space-y-2">
          <div className="font-semibold text-crt-text">{challenge.title}</div>
          <div className="text-crt-dim leading-snug">{challenge.goal}</div>

          <div className="flex gap-2">
            <button
              onClick={onCheck}
              disabled={busy || !ready}
              className="px-3 py-1 border border-crt-accent text-crt-accent hover:bg-crt-accent hover:text-crt-bg rounded disabled:opacity-40"
            >
              {busy ? 'Checking…' : 'Check'}
            </button>
            <button
              onClick={() => loadStarter(idx)}
              className="px-3 py-1 border border-crt-border text-crt-dim hover:text-crt-text rounded"
            >
              Reset board
            </button>
          </div>

          {result && (
            <div className={result.ok ? 'text-crt-accent' : 'text-crt-amber'}>{result.message}</div>
          )}

          {result?.ok && idx < lesson.challenges.length - 1 && (
            <button
              onClick={() => loadStarter(idx + 1)}
              className="px-3 py-1 border border-crt-accent text-crt-accent hover:bg-crt-accent hover:text-crt-bg rounded"
            >
              Next challenge →
            </button>
          )}

          <div className="pt-1">
            {revealed < challenge.hints.length ? (
              <button
                onClick={() => setRevealed((r) => r + 1)}
                className="text-[11px] text-crt-dim hover:text-crt-text underline"
              >
                Show a hint ({revealed}/{challenge.hints.length})
              </button>
            ) : (
              <span className="text-[11px] text-crt-dim">All hints shown</span>
            )}
            <ul className="list-disc ml-4 mt-1 space-y-0.5 text-crt-dim text-[11px]">
              {challenge.hints.slice(0, revealed).map((h, i) => (
                <li key={i}>{h}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}
