/** GitHub's own cap, and the count the banner reports against. */
export const GITHUB_FILE_LIMIT = 3000

/**
 * Turns a failed response into something worth reading. The API's own 400 text is written for
 * the user, so it passes through; everything else gets a friendly line, because a raw error or
 * a status code tells the user nothing they can act on.
 */
export function messageForResponse(status: number, body: unknown): string {
  if (status === 400) {
    const error = (body as { error?: unknown } | null)?.error
    if (typeof error === 'string' && error.trim() !== '') return error
    return 'That link is not a pull request we can read.'
  }

  if (status === 404) return 'That pull request does not exist, or it is private.'
  if (status === 429) return 'Too many requests. Wait a minute and try again.'
  if (status === 502 || status === 503) return 'GitHub is busy, try again in a minute.'

  return 'Something went wrong fetching that pull request.'
}
