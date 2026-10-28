/** Mirrors PrMap.Api.Models.ChangedFile. */
export type ChangedFile = {
  filename: string
  /** added, modified, removed, renamed, copied, changed or unchanged. */
  status: string
  additions: number
  deletions: number
  /** Null for binary files and for diffs GitHub declined to render. */
  patch: string | null
  /** Set only when status is renamed. */
  previousFilename: string | null
  /** additions + deletions. The treemap uses this as box area. */
  changes: number
  hasPatch: boolean
}

/** Mirrors PrMap.Api.Models.PullRequestFiles. */
export type PullRequestFiles = {
  files: ChangedFile[]
  /** True when GitHub capped the response at 3,000 files. */
  truncated: boolean
  fileCount: number
  additions: number
  deletions: number
}
