import { StrictMode } from 'react'
import { Analytics } from '@vercel/analytics/react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
      {/* Vercel Web Analytics. Räknar även sidbyten inom appen, eftersom skriptet följer webbläsarens historik. */}
      <Analytics />
    </BrowserRouter>
  </StrictMode>,
)
