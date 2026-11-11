import { describe, expect, it } from 'vitest'
import { parsePrUrl } from './prUrl'

describe('parsePrUrl', () => {
  it('reads owner, repo and number', () => {
    expect(parsePrUrl('https://github.com/octocat/Hello-World/pull/1')).toEqual({
      owner: 'octocat',
      repo: 'Hello-World',
      number: 1,
    })
  })

  it('ignores a trailing tab and surrounding space', () => {
    expect(parsePrUrl('  https://github.com/dotnet/runtime/pull/100000/files  ')).toEqual({
      owner: 'dotnet',
      repo: 'runtime',
      number: 100000,
    })
  })

  it('accepts the www host', () => {
    expect(parsePrUrl('https://www.github.com/a/b/pull/2')?.repo).toBe('b')
  })

  it.each([
    'not a url',
    'https://gitlab.com/a/b/pull/1',
    'https://github.com/a/b/issues/1',
    'https://github.com/a/b/pull/0',
    'https://github.com/a/b/pull/abc',
    'ftp://github.com/a/b/pull/1',
    'https://github.com/a/pull/1',
  ])('refuses %s', (input) => {
    expect(parsePrUrl(input)).toBeNull()
  })

  it('refuses a host that merely ends in github.com', () => {
    expect(parsePrUrl('https://evil-github.com/a/b/pull/1')).toBeNull()
  })
})
