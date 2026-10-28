import { describe, expect, it } from 'vitest'
import { messageForResponse } from './messages'

describe('messageForResponse', () => {
  it('passes the API validation message through, since it is written for the user', () => {
    const message = messageForResponse(400, {
      error: 'Only https://github.com pull request links are supported.',
    })

    expect(message).toBe('Only https://github.com pull request links are supported.')
  })

  it.each([{}, null, { error: '' }, { error: 42 }])(
    'has its own wording when a 400 carries no usable message (%o)',
    (body) => {
      expect(messageForResponse(400, body)).toBe('That link is not a pull request we can read.')
    },
  )

  it('asks the user to wait on a rate limit', () => {
    expect(messageForResponse(429, null)).toMatch(/wait a minute/i)
  })

  it('blames GitHub, not the user, when GitHub is unavailable', () => {
    expect(messageForResponse(503, null)).toMatch(/github is busy/i)
  })

  it('never leaks a status code or a raw error', () => {
    const message = messageForResponse(500, { error: 'NullReferenceException at line 42' })

    expect(message).not.toMatch(/500|Exception/)
  })
})
