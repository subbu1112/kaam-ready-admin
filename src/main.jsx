import React from 'react'
import ReactDOM from 'react-dom/client'
import * as Sentry from '@sentry/react'
import App from './App'
import './index.css'

// Auto-recover from stale lazy-loaded chunks after a new deploy.
// Guarded: privacy modes can block sessionStorage; fall back to a URL flag
// so the reload still happens exactly once.
window.addEventListener('vite:preloadError', () => {
  try {
    if (!sessionStorage.getItem('kr_reloaded_stale')) {
      sessionStorage.setItem('kr_reloaded_stale', '1')
      window.location.reload()
    }
  } catch {
    try {
      const url = new URL(window.location.href)
      if (url.searchParams.get('kr_r') !== '1') {
        url.searchParams.set('kr_r', '1')
        window.location.replace(url.toString())
      }
    } catch { /* ignore */ }
  }
})

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  integrations: [Sentry.browserTracingIntegration()],
  tracesSampleRate: 0.2,
  environment: import.meta.env.MODE,
})

ReactDOM.createRoot(document.getElementById('root')).render(<App />)
