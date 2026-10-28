import { useCallback, useRef, useState } from 'react'
import { messageForResponse } from './messages'
import type { PullRequestFiles } from './types'

export type PrFilesState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'loaded'; data: PullRequestFiles }
  | { kind: 'error'; message: string }

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
      const response = await fetch(`/api/prs/files?url=${encodeURIComponent(url)}`, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      })

      const body: unknown = await response.json().catch(() => null)

      if (!response.ok) {
        setState({ kind: 'error', message: messageForResponse(response.status, body) })
        return
      }

      setState({ kind: 'loaded', data: body as PullRequestFiles })
    } catch (error) {
      if (controller.signal.aborted) return
      setState({ kind: 'error', message: 'Could not reach the API. Is it running?' })
      void error
    }
  }, [])

  return { state, load }
}
