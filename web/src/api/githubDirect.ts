import { GITHUB_FILE_LIMIT } from './messages'
import { parsePrUrl } from './prUrl'
import type { ChangedFile, PullRequestFiles } from './types'

/**
 * The static build has no API behind it, so the browser talks to GitHub itself. GitHub's REST
 * API sends CORS headers, so this works from a page on github.io; the cost is that anonymous
 * callers get 60 requests an hour per IP and cannot see private repositories at all. A token
 * the user pastes lifts both limits, and it never leaves their own browser.
 */
const API = 'https://api.github.com'
const PER_PAGE = 100
const MAX_PAGES = GITHUB_FILE_LIMIT / PER_PAGE

export class GitHubError extends Error {
  /** True only for the not-found case, where a token with access may be the missing piece. */
  couldBePrivate: boolean

  constructor(message: string, couldBePrivate: boolean) {
    super(message)
    this.couldBePrivate = couldBePrivate
  }
}

type RawFile = {
  filename: string
  status: string
  additions: number
  deletions: number
  changes: number
  patch?: string
  previous_filename?: string
  raw_url?: string
}

function headers(token: string | null): HeadersInit {
  const base: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  }
  if (token) base.Authorization = `Bearer ${token}`
  return base
}

async function get(path: string, token: string | null, signal: AbortSignal): Promise<unknown> {
  const response = await fetch(`${API}${path}`, { headers: headers(token), signal })

  if (response.ok) return response.json()

  if (response.status === 404) {
    throw new GitHubError('That pull request does not exist, or it is private.', true)
  }
  if (response.status === 401) {
    throw new GitHubError('GitHub rejected that token. Check it has not expired.', false)
  }
  if (response.status === 403 || response.status === 429) {
    // Anonymous callers get 60 an hour, which one busy afternoon of browsing uses up.
    const remaining = response.headers.get('x-ratelimit-remaining')
    throw new GitHubError(
      remaining === '0'
        ? 'GitHub’s hourly limit for anonymous requests is used up. Add a token, or wait an hour.'
        : 'GitHub refused that request.',
      false,
    )
  }

  throw new GitHubError('Something went wrong fetching that pull request.', false)
}

export async function fetchPrFilesDirect(
  url: string,
  token: string | null,
  signal: AbortSignal,
): Promise<PullRequestFiles> {
  const reference = parsePrUrl(url)
  if (!reference) throw new GitHubError('That link is not a pull request we can read.', false)

  const { owner, repo, number } = reference
  const base = `/repos/${owner}/${repo}/pulls/${number}`

  const pull = (await get(base, token, signal)) as {
    html_url: string
    additions: number
    deletions: number
    changed_files: number
  }

  const files: ChangedFile[] = []
  let truncated = false

  // GitHub pages the file list and stops at 3,000, the same cap the API build reports against.
  for (let page = 1; page <= MAX_PAGES; page++) {
    const batch = (await get(
      `${base}/files?per_page=${PER_PAGE}&page=${page}`,
      token,
      signal,
    )) as RawFile[]

    for (const file of batch) {
      files.push({
        filename: file.filename,
        status: file.status,
        additions: file.additions,
        deletions: file.deletions,
        changes: file.changes,
        patch: file.patch ?? null,
        previousFilename: file.previous_filename ?? null,
        hasPatch: typeof file.patch === 'string',
        rawUrl: file.raw_url ?? null,
      })
    }

    if (batch.length < PER_PAGE) break
    if (page === MAX_PAGES) truncated = true
  }

  return {
    files,
    truncated: truncated || pull.changed_files > files.length,
    fileCount: pull.changed_files || files.length,
    additions: pull.additions,
    deletions: pull.deletions,
    htmlUrl: pull.html_url,
  }
}
