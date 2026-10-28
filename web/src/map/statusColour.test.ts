import { describe, expect, it } from 'vitest'
import { statusColour } from './statusColour'

describe('statusColour', () => {
  it.each(['added', 'removed', 'modified', 'renamed', 'copied', 'changed', 'unchanged'])(
    'has a colour for %s',
    (status) => {
      expect(statusColour(status)).toMatch(/^#[0-9a-f]{6}$/)
    },
  )

  it('falls back to the neutral for a status GitHub has not documented', () => {
    expect(statusColour('teleported')).toBe(statusColour('copied'))
  })

  it('tells added and removed apart', () => {
    expect(statusColour('added')).not.toBe(statusColour('removed'))
  })
})
