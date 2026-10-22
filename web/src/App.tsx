import { useEffect, useState } from 'react'
import './App.css'

type Health = { status: string }

function App() {
  const [status, setStatus] = useState('checking...')

  useEffect(() => {
    fetch('/api/health')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json() as Promise<Health>
      })
      .then((health) => setStatus(health.status === 'ok' ? 'API ok' : health.status))
      .catch(() => setStatus('API unreachable'))
  }, [])

  return (
    <main>
      <h1>PR Map</h1>
      <p>{status}</p>
    </main>
  )
}

export default App
