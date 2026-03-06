import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import './index.css'
import App from './App.tsx'

// Preconnect to API and Supabase origins for faster first request
function addPreconnectLinks() {
  const apiBase = import.meta.env.VITE_API_BASE_URL as string | undefined
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
  for (const url of [apiBase, supabaseUrl]) {
    if (!url || typeof url !== 'string') continue
    try {
      const origin = new URL(url.replace(/\/$/, '').trim()).origin
      if (!document.querySelector(`link[rel="preconnect"][href="${origin}"]`)) {
        const link = document.createElement('link')
        link.rel = 'preconnect'
        link.href = origin
        link.crossOrigin = 'anonymous'
        document.head.appendChild(link)
      }
    } catch {
      // skip invalid URL
    }
  }
}
addPreconnectLinks()

const darkTheme = createTheme({
  palette: { mode: 'dark' },
  components: {
    MuiCssBaseline: { styleOverrides: { body: { backgroundColor: 'transparent' } } },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider theme={darkTheme}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ThemeProvider>
  </StrictMode>,
)
