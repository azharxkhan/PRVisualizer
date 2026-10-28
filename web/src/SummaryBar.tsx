import { GITHUB_FILE_LIMIT } from './api/messages'
import type { PullRequestFiles } from './api/types'
import { heaviestFolder } from './map/groupByFolder'

const format = new Intl.NumberFormat()

export function SummaryBar({ data }: { data: PullRequestFiles }) {
  const heaviest = heaviestFolder(data.files)

  return (
    <>
      <dl className="summary">
        <div>
          <dt>files changed</dt>
          <dd>{format.format(data.fileCount)}</dd>
        </div>
        <div>
          <dt>lines added</dt>
          <dd className="added">+{format.format(data.additions)}</dd>
        </div>
        <div>
          <dt>lines removed</dt>
          <dd className="removed">−{format.format(data.deletions)}</dd>
        </div>
        <div>
          <dt>heaviest folder</dt>
          <dd title={heaviest ? `${format.format(heaviest.changes)} lines changed` : undefined}>
            {heaviest ? heaviest.name : '—'}
          </dd>
        </div>
      </dl>

      {data.truncated && (
        <p className="banner" role="status">
          GitHub returns at most {format.format(GITHUB_FILE_LIMIT)} files, so this map shows{' '}
          {format.format(GITHUB_FILE_LIMIT)} of a larger pull request.
        </p>
      )}
    </>
  )
}
