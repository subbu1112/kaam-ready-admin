import React from 'react'
import ReactDOM from 'react-dom/client'
import * as Sentry from '@sentry/react'
import App from './App'
import './index.css'

// Auto-recover from stale lazy-loaded chunks after a new deploy.
window.addEventListener('vite:preloadError', () => {
  if (!sessionStorage.getItem('kr_reloaded_stale')) {
    sessionStorage.setItem('kr_reloaded_stale', '1')
    window.location.reload()
  }
})

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  integrations: [Sentry.browserTracingIntegration()],
  tracesSampleRate: 0.2,
  environment: import.meta.env.MODE,
})

ReactDOM.createRoot(document.getElementById('root')).render(<App />)
