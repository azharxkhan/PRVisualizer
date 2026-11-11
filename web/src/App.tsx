import { useState } from 'react'
import './App.css'
import type { ChangedFile } from './api/types'
import { usePrFiles } from './api/usePrFiles'
import { useSession } from './api/useSession'
import { STATIC_BUILD } from './api/mode'
import { SignIn } from './SignIn'
import { TokenBox } from './TokenBox'
import { SummaryBar } from './SummaryBar'
import { DiffPanel } from './diff/DiffPanel'
import { EdgeGraph } from './edges/EdgeGraph'
import { FileList } from './map/FileList'
import { Treemap } from './map/Treemap'
import { LEGEND, statusColour } from './map/statusColour'

const EXAMPLE = 'https://github.com/octocat/Hello-World/pull/1'

const VIEWS = [
  { id: 'map', label: 'Map', hint: 'Box area is lines changed. Click a file to read its diff.' },
  { id: 'list', label: 'List', hint: 'Every file, biggest change first. Click one to read its diff.' },
  {
    id: 'imports',
    label: 'Imports',
    hint: 'Import lines this pull request added, removed, or rewrote in place.',
  },
] as const

type View = (typeof VIEWS)[number]['id']

export default function App() {
  const [url, setUrl] = useState('')
  const [selected, setSelected] = useState<ChangedFile | null>(null)
  const [view, setView] = useState<View>('map')
  const { state, load } = usePrFiles()
  const { session, signOut } = useSession()

  const hint = VIEWS.find((entry) => entry.id === view)?.hint

  return (
    <main>
      <header>
        <div className="titles">
          <h1>PR Map</h1>
          <p className="tagline">
            Paste a GitHub pull request link, get a map of everything that changed.
          </p>
        </div>
        {STATIC_BUILD ? (
          <TokenBox />
        ) : (
          <SignIn session={session} onSignOut={() => void signOut()} />
        )}
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
          {!session.signedIn &&
            state.couldBePrivate &&
            (STATIC_BUILD ? (
              <> If it is in a private repository, a token with access to it is all it needs.</>
            ) : (
              <> If it is in a private repository, signing in may be all it needs.</>
            ))}
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

          <div className="toolbar">
            <div className="tabs" role="tablist">
              {VIEWS.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  role="tab"
                  aria-selected={view === entry.id}
                  className={view === entry.id ? 'current' : undefined}
                  onClick={() => setView(entry.id)}
                >
                  {entry.label}
                </button>
              ))}
            </div>

            <ul className="legend" hidden={view === 'imports'}>
              {LEGEND.map(({ status, label }) => (
                <li key={status}>
                  <span className="swatch" style={{ background: statusColour(status) }} />
                  {label}
                </li>
              ))}
            </ul>
          </div>

          {view === 'imports' && <EdgeGraph files={state.data.files} />}

          <div className={selected ? 'split open' : 'split'} hidden={view === 'imports'}>
            {view === 'map' ? (
              <Treemap
                files={state.data.files}
                selected={selected}
                onSelect={(file) => setSelected(file)}
              />
            ) : (
              <FileList
                files={state.data.files}
                selected={selected}
                onSelect={(file) => setSelected(file)}
              />
            )}
            {selected && (
              <DiffPanel
                file={selected}
                htmlUrl={state.data.htmlUrl}
                onClose={() => setSelected(null)}
              />
            )}
          </div>

          <p className="hint">{hint}</p>
        </section>
      )}
    </main>
  )
}
