import { useState } from 'react'
import { readToken, writeToken } from './api/mode'

const NEW_TOKEN = 'https://github.com/settings/personal-access-tokens/new'

/**
 * The static build's stand-in for signing in. There is no server to hold a token, so the user
 * supplies their own and it stays in their browser's local storage, sent only to api.github.com.
 */
export function TokenBox() {
  const [saved, setSaved] = useState(() => readToken() !== null)
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState('')

  if (!open) {
    return (
      <p className="signed-in">
        {saved && <span>token saved</span>}
        <button type="button" onClick={() => setOpen(true)}>
          {saved ? 'Change token' : 'Add a GitHub token'}
        </button>
        {saved && (
          <button
            type="button"
            onClick={() => {
              writeToken(null)
              setSaved(false)
            }}
          >
            Forget
          </button>
        )}
      </p>
    )
  }

  return (
    <form
      className="token"
      onSubmit={(event) => {
        event.preventDefault()
        writeToken(value)
        setSaved(value.trim() !== '')
        setValue('')
        setOpen(false)
      }}
    >
      <label className="visually-hidden" htmlFor="token">
        GitHub personal access token
      </label>
      <input
        id="token"
        type="password"
        autoComplete="off"
        placeholder="github_pat_…"
        value={value}
        onChange={(event) => setValue(event.target.value)}
      />
      <button type="submit">Save</button>
      <p className="token-note">
        Stored in this browser only, and sent only to api.github.com. A{' '}
        <a href={NEW_TOKEN} target="_blank" rel="noreferrer">
          fine-grained token
        </a>{' '}
        with read-only pull request access is enough; without one you get GitHub’s 60 requests an
        hour and public repositories only.
      </p>
    </form>
  )
}
