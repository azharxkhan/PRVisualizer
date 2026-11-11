export type PrReference = { owner: string; repo: string; number: number }

/** GitHub's own rules: owner and repo are letters, digits, dot, dash and underscore. */
const PATH = /^\/([\w.-]+)\/([\w.-]+)\/pull\/(\d+)(?:\/.*)?$/

/**
 * Mirrors the validation the API does server-side, for the static build that has no API.
 * Returns null rather than throwing, because a bad paste is an everyday thing, not an error.
 */
export function parsePrUrl(input: string): PrReference | null {
  let url: URL
  try {
    url = new URL(input.trim())
  } catch {
    return null
  }

  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
  if (url.hostname !== 'github.com' && url.hostname !== 'www.github.com') return null

  const match = PATH.exec(url.pathname)
  if (!match) return null

  const number = Number(match[3])
  if (!Number.isSafeInteger(number) || number < 1) return null

  return { owner: match[1], repo: match[2], number }
}
