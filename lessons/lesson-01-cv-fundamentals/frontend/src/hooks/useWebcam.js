import { useCallback, useEffect, useRef, useState } from 'react'

export function useWebcam() {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const [active, setActive] = useState(false)
  const [error, setError] = useState(null)

  const start = useCallback(async () => {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setActive(true)
    } catch (err) {
      setError(err.message || String(err))
      setActive(false)
    }
  }, [])

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setActive(false)
  }, [])

  // Capture current frame as base64 PNG (no data URL prefix).
  const capture = useCallback(() => {
    const video = videoRef.current
    if (!video || !video.videoWidth) return null
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d').drawImage(video, 0, 0)
    const dataUrl = canvas.toDataURL('image/png')
    return dataUrl.split(',')[1]
  }, [])

  // Make sure we release the camera when the component unmounts.
  useEffect(() => () => stop(), [stop])

  return { videoRef, active, error, start, stop, capture }
}
