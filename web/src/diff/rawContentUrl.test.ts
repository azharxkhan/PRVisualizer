import { describe, expect, it } from 'vitest'
import { rawContentUrl } from './rawContentUrl'

describe('rawContentUrl', () => {
  it('moves a github.com raw URL to the host that sends CORS headers', () => {
    expect(
      rawContentUrl('https://github.com/octocat/Hello-World/raw/abc123/docs/README.md'),
    ).toBe('https://raw.githubusercontent.com/octocat/Hello-World/abc123/docs/README.md')
  })

  it('keeps a path with more segments intact', () => {
    expect(rawContentUrl('https://github.com/a/b/raw/sha/one/two/three.png')).toBe(
      'https://raw.githubusercontent.com/a/b/sha/one/two/three.png',
    )
  })

  it('leaves a URL that is already on the raw host alone', () => {
    const url = 'https://raw.githubusercontent.com/a/b/sha/x.md'
    expect(rawContentUrl(url)).toBe(url)
  })

  it('leaves an enterprise host alone rather than guessing', () => {
    const url = 'https://github.example.com/a/b/raw/sha/x.md'
    expect(rawContentUrl(url)).toBe(url)
  })

  it('leaves a github.com URL that is not a raw link alone', () => {
    const url = 'https://github.com/a/b/blob/sha/x.md'
    expect(rawContentUrl(url)).toBe(url)
  })

  it('returns anything unparseable unchanged', () => {
    expect(rawContentUrl('not a url')).toBe('not a url')
  })
})
