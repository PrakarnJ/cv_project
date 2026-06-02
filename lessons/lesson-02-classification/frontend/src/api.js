import axios from 'axios'

export const api = axios.create({ baseURL: 'http://localhost:8000' })

export const getLesson = () => api.get('/lesson').then((r) => r.data)
export const getTutorial = () => api.get('/tutorial').then((r) => r.data)
export const getModels = () => api.get('/models').then((r) => r.data)
export const infer = (payload) =>
  api.post('/playground/infer', payload).then((r) => r.data)
export const getExercises = () => api.get('/exercises').then((r) => r.data)
export const getExercise = (id) =>
  api.get(`/exercises/${id}`).then((r) => r.data)
export const runExercise = (id, code) =>
  api.post(`/exercises/${id}/run`, { code }).then((r) => r.data)
export const getSolution = (id) =>
  api.get(`/exercises/${id}/solution`).then((r) => r.data)
export const getProgress = () => api.get('/progress').then((r) => r.data)
export const updateProgress = (payload) =>
  api.post('/progress', payload).then((r) => r.data)

// SSE test runner. Browser EventSource only does GET; the endpoint is POST so
// we use fetch with a streaming reader and parse the SSE wire format manually.
export async function streamTests(exerciseId, code, { onLine, onDone, signal } = {}) {
  const res = await fetch(
    `${api.defaults.baseURL}/exercises/${exerciseId}/test`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
      },
      body: JSON.stringify({ code }),
      signal,
    },
  )
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail || `HTTP ${res.status}`)
  }
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buf = ''
  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buf += decoder.decode(value, { stream: true })
    let idx
    while ((idx = buf.indexOf('\n\n')) >= 0) {
      const block = buf.slice(0, idx)
      buf = buf.slice(idx + 2)
      let event = null
      let data = null
      for (const line of block.split('\n')) {
        if (line.startsWith('event:')) event = line.slice(6).trim()
        else if (line.startsWith('data:')) data = line.slice(5).trim()
      }
      if (event === 'line' && data !== null) onLine?.(data)
      else if (event === 'done' && data !== null) onDone?.(JSON.parse(data))
    }
  }
}
