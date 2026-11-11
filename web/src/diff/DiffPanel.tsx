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

/**
 * Which views a file can offer. The diff shows only the hunks GitHub sent, so "File" is there
 * for the common case of needing the lines around a change, or the whole thing.
 */
type Mode = 'diff' | 'file' | 'rendered' | 'image'

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

  // A removed file has no contents at the head commit, so there is nothing to fetch or show.
  const present = file.status !== 'removed'
  // github.com's raw URL has no CORS headers, so the panel asks raw.githubusercontent instead.
  const rawUrl = present && file.rawUrl ? rawContentUrl(file.rawUrl) : null

  const views: ReadonlyArray<{ id: Mode; label: string }> = [
    ...(preview.kind === 'patch' ? [{ id: 'diff' as const, label: 'Diff' }] : []),
    ...(rawUrl && kind === 'markdown' ? [{ id: 'rendered' as const, label: 'Rendered' }] : []),
    ...(rawUrl && (kind === 'image' || kind === 'svg')
      ? [{ id: 'image' as const, label: 'Image' }]
      : []),
    // Text and markdown read as a whole file; an image or a PDF has no lines to number.
    ...(rawUrl && (kind === 'text' || kind === 'markdown' || kind === 'svg')
      ? [{ id: 'file' as const, label: 'File' }]
      : []),
  ]

  const fallback: Mode = views[0]?.id ?? 'diff'
  const picked = chosen?.filename === file.filename ? chosen.mode : fallback
  // A remembered choice may not exist for this file, so fall back rather than showing nothing.
  const mode = views.some((view) => view.id === picked) ? picked : fallback
  const setMode = (next: Mode) => setChosen({ filename: file.filename, mode: next })

  const raw = useRawFile(rawUrl, mode === 'rendered' || mode === 'file')
  const html = useMemo(
    () => (raw.kind === 'loaded' && mode === 'rendered' ? renderMarkdown(raw.text) : null),
    [raw, mode],
  )
  const lines = useMemo(
    () => (raw.kind === 'loaded' && mode === 'file' ? raw.text.split('\n') : null),
    [raw, mode],
  )

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
          {views.length > 1 && (
            <div className="tabs small" role="tablist">
              {views.map((view) => (
                <button
                  key={view.id}
                  type="button"
                  role="tab"
                  aria-selected={mode === view.id}
                  className={mode === view.id ? 'current' : undefined}
                  onClick={() => setMode(view.id)}
                >
                  {view.label}
                </button>
              ))}
            </div>
          )}
          <button type="button" className="close" onClick={onClose} aria-label="Close the diff">
            ×
          </button>
        </div>
      </header>

      <div className="diff-body">
        {(mode === 'rendered' || mode === 'file') && (
          <>
            {raw.kind === 'loading' && <p className="fallback">Loading the file…</p>}
            {raw.kind === 'error' && <p className="fallback">{raw.message}</p>}
          </>
        )}

        {html !== null && (
          // marked's output, with raw HTML dropped and URLs restricted to http(s).
          <div className="markdown" dangerouslySetInnerHTML={{ __html: html }} />
        )}

        {lines !== null && (
          <table className="whole-file">
            <caption>
              The whole file at this pull request’s head commit, {format.format(lines.length)}{' '}
              {lines.length === 1 ? 'line' : 'lines'}.
            </caption>
            <tbody>
              {lines.map((line, index) => (
                <tr key={index}>
                  <td className="gutter">{index + 1}</td>
                  <td className="code">{line || ' '}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {mode === 'image' && rawUrl && (
          <div className="image-preview">
            <img src={rawUrl} alt={file.filename} />
            <p className="caption">The file at this pull request’s head commit.</p>
          </div>
        )}

        {mode === 'diff' &&
          preview.kind === 'patch' &&
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

        {mode === 'diff' && preview.kind === 'too-big' && (
          <p className="fallback">
            Too big to preview. GitHub leaves the diff out of its response for a file this large.{' '}
            <a href={`${htmlUrl}/files`} target="_blank" rel="noreferrer noopener">
              Read it on GitHub
            </a>
            .
          </p>
        )}

        {mode === 'diff' && preview.kind === 'none' && (
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
