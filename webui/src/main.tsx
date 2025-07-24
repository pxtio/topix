import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import './index.css'
import App from './App.tsx'

document.documentElement.classList.add(GeistSans.variable)
document.documentElement.classList.add(GeistMono.variable)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
