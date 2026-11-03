import { useCallback, useEffect, useState } from 'react'

export type Session = { signedIn: boolean; login: string | null }

const SIGNED_OUT: Session = { signedIn: false, login: null }

/**
 * Who, if anyone, is signed in. The answer is the login and nothing else: the token stays on
 * the server, so there is nothing else for the browser to know.
 */
export function useSession() {
  const [session, setSession] = useState<Session>(SIGNED_OUT)

  const refresh = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/me', { headers: { Accept: 'application/json' } })
      setSession(response.ok ? ((await response.json()) as Session) : SIGNED_OUT)
    } catch {
      // The API being unreachable is already reported where a pull request is loaded.
      setSession(SIGNED_OUT)
    }
  }, [])

  useEffect(() => {
    // Asking the server who is signed in is exactly the external synchronisation effects are
    // for, and the state is set from the response, not synchronously during the effect.
    // oxlint-disable-next-line react/set-state-in-effect
    void refresh()
  }, [refresh])

  const signOut = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    await refresh()
  }, [refresh])

  return { session, signOut }
}
