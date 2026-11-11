import { useCallback, useRef, useState } from 'react'
import { fetchPrFilesDirect, GitHubError } from './githubDirect'
import { messageForResponse } from './messages'
import { readToken, STATIC_BUILD } from './mode'
import type { PullRequestFiles } from './types'

export type PrFilesState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'loaded'; data: PullRequestFiles }
  /** couldBePrivate marks the not-found case, where signing in may be the missing piece. */
  | { kind: 'error'; message: string; couldBePrivate: boolean }

/**
 * Fetches one pull request's files. The URL goes to the server as pasted: parsing and validating
 * it is the API's job, so there is one authority on what a pull request link looks like.
 */
export function usePrFiles() {
  const [state, setState] = useState<PrFilesState>({ kind: 'idle' })
  const inFlight = useRef<AbortController | null>(null)

  const load = useCallback(async (url: string) => {
    // A second submit abandons the first, so a slow response cannot overwrite a newer one.
    inFlight.current?.abort()
    const controller = new AbortController()
    inFlight.current = controller

    setState({ kind: 'loading' })

    try {
      // On GitHub Pages there is no API to call, so the browser asks GitHub itself.
      if (STATIC_BUILD) {
        const data = await fetchPrFilesDirect(url, readToken(), controller.signal)
        setState({ kind: 'loaded', data })
        return
      }

      const response = await fetch(`/api/prs/files?url=${encodeURIComponent(url)}`, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      })

      const body: unknown = await response.json().catch(() => null)

      if (!response.ok) {
        setState({
          kind: 'error',
          message: messageForResponse(response.status, body),
          couldBePrivate: response.status === 404,
        })
        return
      }

      setState({ kind: 'loaded', data: body as PullRequestFiles })
    } catch (error) {
      if (controller.signal.aborted) return

      if (error instanceof GitHubError) {
        setState({ kind: 'error', message: error.message, couldBePrivate: error.couldBePrivate })
        return
      }

      setState({
        kind: 'error',
        message: STATIC_BUILD
          ? 'Could not reach GitHub. Check your connection and try again.'
          : 'Could not reach the API. Is it running?',
        couldBePrivate: false,
      })
    }
  }, [])

  return { state, load }
}
