import { useState } from 'react'
import './App.css'
import type { ChangedFile } from './api/types'
import { usePrFiles } from './api/usePrFiles'
import { useSession } from './api/useSession'
import { SignIn } from './SignIn'
import { SummaryBar } from './SummaryBar'
import { DiffPanel } from './diff/DiffPanel'
import { EdgeGraph } from './edges/EdgeGraph'
import { Treemap } from './map/Treemap'
import { LEGEND, statusColour } from './map/statusColour'

const EXAMPLE = 'https://github.com/octocat/Hello-World/pull/1'

export default function App() {
  const [url, setUrl] = useState('')
  const [selected, setSelected] = useState<ChangedFile | null>(null)
  const [view, setView] = useState<'map' | 'imports'>('map')
  const { state, load } = usePrFiles()
  const { session, signOut } = useSession()

  return (
    <main>
      <header>
        <div className="titles">
          <h1>PR Map</h1>
          <p className="tagline">
            Paste a GitHub pull request link, get a map of everything that changed.
          </p>
        </div>
        <SignIn session={session} onSignOut={() => void signOut()} />
      </header>

      <form
        onSubmit={(event) => {
          event.preventDefault()
          // A diff from the previous pull request has no business staying open over the new map.
          setSelected(null)
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
          {!session.signedIn && state.couldBePrivate && (
            <> If it is in a private repository, signing in may be all it needs.</>
          )}
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

          <div className="tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={view === 'map'}
              className={view === 'map' ? 'current' : undefined}
              onClick={() => setView('map')}
            >
              Map
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={view === 'imports'}
              className={view === 'imports' ? 'current' : undefined}
              onClick={() => setView('imports')}
            >
              Imports
            </button>
          </div>

          {view === 'imports' && <EdgeGraph files={state.data.files} />}

          <div className={selected ? 'split open' : 'split'} hidden={view !== 'map'}>
            <Treemap
              files={state.data.files}
              selected={selected}
              onSelect={(file) => setSelected(file)}
            />
            {selected && (
              <DiffPanel
                file={selected}
                htmlUrl={state.data.htmlUrl}
                onClose={() => setSelected(null)}
              />
            )}
          </div>
          <ul className="legend" hidden={view !== 'map'}>
            {LEGEND.map(({ status, label }) => (
              <li key={status}>
                <span className="swatch" style={{ background: statusColour(status) }} />
                {label}
              </li>
            ))}
          </ul>
          <p className="hint">
            {view === 'map'
              ? 'Box area is lines changed. Click a file to read its diff.'
              : 'Import lines this pull request added, removed, or rewrote in place.'}
          </p>
        </section>
      )}
    </main>
  )
}
