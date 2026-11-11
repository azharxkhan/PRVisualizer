import type { ChangedFile } from '../api/types'
import { statusColour } from './statusColour'

type Props = {
  files: ChangedFile[]
  selected?: ChangedFile | null
  onSelect?: (file: ChangedFile) => void
}

/**
 * The treemap answers "where is the weight", but a ranked list answers "what changed" without
 * any decoding at all, so it is the view to fall back on when the map is hard to read.
 */
export function FileList({ files, selected, onSelect }: Props) {
  const ordered = [...files].sort((a, b) => b.changes - a.changes)
  const widest = ordered[0]?.changes || 1

  return (
    <ul className="files">
      {ordered.map((file) => {
        const slash = file.filename.lastIndexOf('/')
        const dir = slash === -1 ? '' : file.filename.slice(0, slash + 1)
        const name = slash === -1 ? file.filename : file.filename.slice(slash + 1)
        // Both bars share one scale, so a row's total length compares across the whole list.
        const scale = 100 / widest

        return (
          <li key={file.filename} className={file.filename === selected?.filename ? 'current' : undefined}>
            <button
              type="button"
              onClick={() => onSelect?.(file)}
              aria-pressed={file.filename === selected?.filename}
            >
              <span
                className="dot"
                style={{ background: statusColour(file.status) }}
                title={file.status}
              />
              <span className="name" title={file.filename}>
                <span className="dir">{dir}</span>
                {name}
              </span>
              <span className="nums">
                <span className="added">+{file.additions}</span>
                <span className="removed">−{file.deletions}</span>
              </span>
              <span className="bar" aria-hidden="true">
                <i className="add" style={{ width: `${file.additions * scale}%` }} />
                <i className="del" style={{ width: `${file.deletions * scale}%` }} />
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
