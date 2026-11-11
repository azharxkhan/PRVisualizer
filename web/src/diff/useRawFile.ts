import { useEffect, useState } from 'react'

export type RawFile =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'loaded'; text: string }
  | { kind: 'error'; message: string }

/** Nobody needs a megabyte of markdown rendered into the panel. */
const MAX_BYTES = 512 * 1024

/**
 * Fetches a file's contents for the rendered view. The diff itself never needs this: it is only
 * for showing a markdown file as markdown, which needs the whole file and not just its patch.
 *
 * `enabled` keeps the fetch from happening until the reader asks for that view.
 */
export function useRawFile(url: string | null, enabled: boolean): RawFile {
  const [state, setState] = useState<RawFile>({ kind: 'idle' })

  useEffect(() => {
    if (!enabled || !url) return

    const controller = new AbortController()
    // Fetching a file is exactly the external synchronisation effects are for, and the result
    // is set from the response rather than synchronously during the effect.
    // oxlint-disable-next-line react/set-state-in-effect
    setState({ kind: 'loading' })

    void (async () => {
      try {
        const response = await fetch(url, { signal: controller.signal })
        if (!response.ok) {
          setState({
            kind: 'error',
            message:
              response.status === 404
                ? 'GitHub has no contents at that path for this commit.'
                : 'Could not load this file’s contents. Private repositories need the raw file to be reachable.',
          })
          return
        }

        const text = await response.text()
        setState(
          text.length > MAX_BYTES
            ? { kind: 'error', message: 'This file is too large to render here.' }
            : { kind: 'loaded', text },
        )
      } catch {
        if (!controller.signal.aborted) {
          setState({ kind: 'error', message: 'Could not load this file’s contents.' })
        }
      }
    })()

    return () => controller.abort()
  }, [url, enabled])

  // Idle is derived rather than stored: with no file to fetch the answer is idle whatever the
  // last fetch left behind, so there is nothing to reset.
  return enabled && url ? state : { kind: 'idle' }
}
