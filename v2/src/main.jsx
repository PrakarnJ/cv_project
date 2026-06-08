import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { OpenCVProvider } from './opencv/OpenCVContext'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <OpenCVProvider>
      <App />
    </OpenCVProvider>
  </React.StrictMode>
)
