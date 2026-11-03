import type { Session } from './api/useSession'

type Props = {
  session: Session
  onSignOut: () => void
}

export function SignIn({ session, onSignOut }: Props) {
  if (!session.signedIn) {
    // A plain link, not fetch: the browser has to follow the redirect to GitHub itself.
    return (
      <a className="sign-in" href="/api/auth/login">
        Sign in with GitHub
      </a>
    )
  }

  return (
    <p className="signed-in">
      <span>{session.login}</span>
      <button type="button" onClick={onSignOut}>
        Sign out
      </button>
    </p>
  )
}
