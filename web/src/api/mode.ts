/**
 * Two ways to run this app:
 *
 * - "api": the .NET API holds the GitHub token and the browser holds a session cookie. This is
 *   the full build, and the one `npm run dev` gives you.
 * - "static": there is no server at all, so the browser calls GitHub directly. This is what
 *   GitHub Pages can host, since Pages serves files and nothing else.
 *
 * The Pages workflow builds with VITE_STATIC=true.
 */
export const STATIC_BUILD = import.meta.env.VITE_STATIC === 'true'

const TOKEN_KEY = 'prmap.token'

/**
 * In the static build the token is the user's own, kept in their own browser and sent only to
 * api.github.com. It is never sent anywhere else, and there is no server here to send it to.
 */
export function readToken(): string | null {
  try {
    const stored = localStorage.getItem(TOKEN_KEY)
    return stored && stored.trim() !== '' ? stored : null
  } catch {
    return null
  }
}

export function writeToken(token: string | null): void {
  try {
    if (token && token.trim() !== '') localStorage.setItem(TOKEN_KEY, token.trim())
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    // A browser with storage blocked just means the token lasts for this page view.
  }
}
