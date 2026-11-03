import { useEffect } from 'react'
import type { ChangedFile } from '../api/types'
import { statusColour } from '../map/statusColour'
import { previewFor } from './preview'

const format = new Intl.NumberFormat()

type Props = {
  file: ChangedFile
  /** The pull request on GitHub, as the API resolved it. */
  htmlUrl: string
  onClose: () => void
}

export function DiffPanel({ file, htmlUrl, onClose }: Props) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const preview = previewFor(file)

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
        <button type="button" className="close" onClick={onClose} aria-label="Close the diff">
          ×
        </button>
      </header>

      <div className="diff-body">
        {preview.kind === 'patch' &&
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

        {preview.kind === 'too-big' && (
          <p className="fallback">
            Too big to preview. GitHub leaves the diff out of its response for a file this large.{' '}
            <a href={`${htmlUrl}/files`} target="_blank" rel="noreferrer noopener">
              Read it on GitHub
            </a>
            .
          </p>
        )}

        {preview.kind === 'none' && (
          <p className="fallback">
            No preview available. GitHub sent no diff for this file and reports no changed lines,
            which is what it does for a binary file.
          </p>
        )}
      </div>
    </aside>
  )
}
