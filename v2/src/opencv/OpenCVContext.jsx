import { createContext, useContext, useEffect, useState } from 'react'

const OpenCVContext = createContext({ cv: null, ready: false, error: null })

// OpenCV.js is a ~10MB WASM bundle served locally from /public/opencv/opencv.js
// (bundled, not CDN, so the app works offline). It loads exactly once.
let loadPromise = null

function loadOpenCv(src = '/opencv/opencv.js') {
  if (loadPromise) return loadPromise
  loadPromise = new Promise((resolve, reject) => {
    if (window.cv && typeof window.cv.Mat === 'function') return resolve('ready')

    // Poll for the WASM runtime — robust across all opencv.js build variants
    // (ready module / Promise / late onRuntimeInitialized).
    // IMPORTANT: never resolve the promise WITH `window.cv`. An Emscripten Module
    // is "thenable" (it has a `.then` so `await Module` works); resolving a promise
    // with a thenable makes the runtime recursively assimilate it forever — an
    // infinite microtask loop that silently freezes the page. Resolve a sentinel
    // and let the provider read `window.cv` from the global.
    const startWait = () => {
      const t0 = Date.now()
      const tick = () => {
        if (window.cv instanceof Promise) {
          window.cv.then((c) => {
            window.cv = c
            resolve('ready')
          })
          return
        }
        if (window.cv && typeof window.cv.Mat === 'function') {
          return resolve('ready')
        }
        if (Date.now() - t0 > 60000) return reject(new Error('OpenCV runtime init timed out'))
        setTimeout(tick, 100)
      }
      tick()
    }

    const script = document.createElement('script')
    script.src = src
    script.async = true
    script.onload = () => startWait()
    script.onerror = () => reject(new Error('Failed to load ' + src))
    document.body.appendChild(script)
  })
  return loadPromise
}

export function OpenCVProvider({ children }) {
  const [state, setState] = useState({ cv: null, ready: false, error: null })

  useEffect(() => {
    let alive = true
    loadOpenCv()
      .then(() => alive && setState({ cv: window.cv, ready: true, error: null }))
      .catch((err) => alive && setState({ cv: null, ready: false, error: err.message }))
    return () => {
      alive = false
    }
  }, [])

  return <OpenCVContext.Provider value={state}>{children}</OpenCVContext.Provider>
}

export function useOpenCV() {
  return useContext(OpenCVContext)
}
