import { useEffect, useMemo, useState } from 'react'
import type { ChangedFile } from '../api/types'
import { statusColour } from '../map/statusColour'
import { binaryLabel, kindOf } from './fileKind'
import { renderMarkdown } from './markdown'
import { previewFor } from './preview'
import { rawContentUrl } from './rawContentUrl'
import { useRawFile } from './useRawFile'

const format = new Intl.NumberFormat()

type Props = {
  file: ChangedFile
  /** The pull request on GitHub, as the API resolved it. */
  htmlUrl: string
  onClose: () => void
}

/** Diff is always offered; the second view depends on what the file is. */
type Mode = 'diff' | 'rendered'

export function DiffPanel({ file, htmlUrl, onClose }: Props) {
  /**
   * The chosen view is remembered against the file it was chosen for, so clicking a different
   * file falls back to that file's own default rather than carrying the last choice over.
   */
  const [chosen, setChosen] = useState<{ filename: string; mode: Mode } | null>(null)

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const kind = kindOf(file.filename)
  const preview = previewFor(file)

  // A removed file has no contents at the head commit, so there is nothing to render or show.
  const present = file.status !== 'removed'
  // github.com's raw URL has no CORS headers, so the panel asks raw.githubusercontent instead.
  const rawUrl = file.rawUrl ? rawContentUrl(file.rawUrl) : null
  const canRender = present && rawUrl !== null && (kind === 'markdown' || kind === 'svg')
  const canShowImage = present && rawUrl !== null && (kind === 'image' || kind === 'svg')

  const fallback: Mode = preview.kind === 'patch' ? 'diff' : 'rendered'
  const mode = chosen?.filename === file.filename ? chosen.mode : fallback
  const setMode = (next: Mode) => setChosen({ filename: file.filename, mode: next })

  const wantsRaw = mode === 'rendered' && canRender && kind === 'markdown'
  const raw = useRawFile(rawUrl, wantsRaw)
  const html = useMemo(
    () => (raw.kind === 'loaded' ? renderMarkdown(raw.text) : null),
    [raw],
  )

  const second = canRender
    ? { id: 'rendered' as const, label: kind === 'markdown' ? 'Rendered' : 'Image' }
    : canShowImage
      ? { id: 'rendered' as const, label: 'Image' }
      : null

  const showingDiff = mode === 'diff' || !second

  return (
    <aside className="diff" aria-label={`Diff for ${file.filename}`}>
      <header>
        <div>
          <p className="path">{file.filename}</p>
          {file.previousFilename && <p className="renamed">renamed from {file.previousFilename}</p>}
          <p className="counts">
            <span className="chip" style={{ background: statusColour(file.status) }}>
              {file.status}
            </span>
            <span className="added">+{format.format(file.additions)}</span>
            <span className="removed">−{format.format(file.deletions)}</span>
          </p>
        </div>
        <div className="diff-actions">
          {second && (
            <div className="tabs small" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={showingDiff}
                className={showingDiff ? 'current' : undefined}
                onClick={() => setMode('diff')}
              >
                {kind === 'markdown' ? 'Source' : 'Diff'}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={!showingDiff}
                className={!showingDiff ? 'current' : undefined}
                onClick={() => setMode('rendered')}
              >
                {second.label}
              </button>
            </div>
          )}
          <button type="button" className="close" onClick={onClose} aria-label="Close the diff">
            ×
          </button>
        </div>
      </header>

      <div className="diff-body">
        {!showingDiff && kind === 'markdown' && (
          <>
            {raw.kind === 'loading' && <p className="fallback">Loading the file…</p>}
            {raw.kind === 'error' && <p className="fallback">{raw.message}</p>}
            {html !== null && (
              // marked's output, with raw HTML dropped and URLs restricted to http(s).
              <div className="markdown" dangerouslySetInnerHTML={{ __html: html }} />
            )}
          </>
        )}

        {!showingDiff && kind !== 'markdown' && rawUrl && (
          <div className="image-preview">
            <img src={rawUrl} alt={file.filename} />
            <p className="caption">The file at this pull request’s head commit.</p>
          </div>
        )}

        {showingDiff && preview.kind === 'patch' &&
          preview.hunks.map((hunk) => (
            <table key={hunk.header}>
              <caption>{hunk.header}</caption>
              <tbody>
                {hunk.lines.map((line, index) => (
                  <tr key={index} className={line.kind}>
                    <td className="gutter">{line.oldNumber ?? ''}</td>
                    <td className="gutter">{line.newNumber ?? ''}</td>
                    <td className="code">{line.content || ' '}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ))}

        {showingDiff && preview.kind === 'too-big' && (
          <p className="fallback">
            Too big to preview. GitHub leaves the diff out of its response for a file this large.{' '}
            <a href={`${htmlUrl}/files`} target="_blank" rel="noreferrer noopener">
              Read it on GitHub
            </a>
            .
          </p>
        )}

        {showingDiff && preview.kind === 'none' && (
          <p className="fallback">
            {binaryLabel(file.filename)
              ? `This is a ${binaryLabel(file.filename)} file, so there are no lines to diff.`
              : 'No preview available. GitHub sent no diff for this file and reports no changed lines, which is what it does for a binary file.'}{' '}
            <a href={`${htmlUrl}/files`} target="_blank" rel="noreferrer noopener">
              Open it on GitHub
            </a>
            .
          </p>
        )}
      </div>
    </aside>
  )
}
