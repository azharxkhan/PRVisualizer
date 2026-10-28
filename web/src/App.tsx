import { useState } from 'react'
import './App.css'
import { usePrFiles } from './api/usePrFiles'
import { SummaryBar } from './SummaryBar'
import { Treemap } from './map/Treemap'
import { LEGEND, statusColour } from './map/statusColour'

const EXAMPLE = 'https://github.com/octocat/Hello-World/pull/1'

export default function App() {
  const [url, setUrl] = useState('')
  const { state, load } = usePrFiles()

  return (
    <main>
      <header>
        <h1>PR Map</h1>
        <p className="tagline">
          Paste a GitHub pull request link, get a map of everything that changed.
        </p>
      </header>

      <form
        onSubmit={(event) => {
          event.preventDefault()
          void load(url)
        }}
      >
        <label className="visually-hidden" htmlFor="pr-url">
          Pull request URL
        </label>
        <input
          id="pr-url"
          type="url"
          name="url"
          value={url}
          placeholder={EXAMPLE}
          onChange={(event) => setUrl(event.target.value)}
          required
        />
        <button type="submit" disabled={state.kind === 'loading'}>
          {state.kind === 'loading' ? 'Loading…' : 'Map it'}
        </button>
      </form>

      {state.kind === 'error' && (
        <p className="error" role="alert">
          {state.message}
        </p>
      )}

      {state.kind === 'loaded' && state.data.fileCount === 0 && (
        <p className="error" role="status">
          That pull request changes no files.
        </p>
      )}

      {state.kind === 'loaded' && state.data.fileCount > 0 && (
        <section className="map">
          <SummaryBar data={state.data} />
          <Treemap files={state.data.files} />
          <ul className="legend">
            {LEGEND.map(({ status, label }) => (
              <li key={status}>
                <span className="swatch" style={{ background: statusColour(status) }} />
                {label}
              </li>
            ))}
          </ul>
          <p className="hint">Box area is lines changed. Clicking a file opens its diff in Phase 4.</p>
        </section>
      )}
    </main>
  )
}
