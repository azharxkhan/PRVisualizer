/**
 * GitHub's `raw_url` points at github.com/<owner>/<repo>/raw/<sha>/<path>, which redirects to
 * raw.githubusercontent.com but sends no CORS headers of its own, so a browser fetch of it is
 * blocked before the redirect happens. raw.githubusercontent.com does send them, so the panel
 * asks for that host directly.
 *
 * Anything that is not a github.com raw URL is returned unchanged: an enterprise host or a URL
 * GitHub shapes differently is better left alone than rewritten into something wrong.
 */
const RAW = /^\/([^/]+)\/([^/]+)\/raw\/(.+)$/

export function rawContentUrl(rawUrl: string): string {
  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    return rawUrl
  }

  if (url.hostname !== 'github.com' && url.hostname !== 'www.github.com') return rawUrl

  const match = RAW.exec(url.pathname)
  if (!match) return rawUrl

  return `https://raw.githubusercontent.com/${match[1]}/${match[2]}/${match[3]}${url.search}`
}
