import { describe, expect, it } from 'vitest'
import { binaryLabel, extensionOf, kindOf } from './fileKind'

describe('extensionOf', () => {
  it('reads the extension', () => {
    expect(extensionOf('web/src/App.tsx')).toBe('tsx')
  })

  it('lowercases it, so README.MD is markdown', () => {
    expect(extensionOf('README.MD')).toBe('md')
  })

  it('is empty for a file with no extension', () => {
    expect(extensionOf('LICENSE')).toBe('')
  })

  it('ignores a dot that belongs to a directory, not the file', () => {
    expect(extensionOf('.github/workflows/ci')).toBe('')
  })

  it('is empty for a dotfile with no extension', () => {
    expect(extensionOf('.gitignore')).toBe('gitignore')
  })

  it('is empty for a trailing dot', () => {
    expect(extensionOf('weird.')).toBe('')
  })
})

describe('kindOf', () => {
  it.each([
    ['docs/plan.md', 'markdown'],
    ['docs/plan.markdown', 'markdown'],
    ['docs/architecture.svg', 'svg'],
    ['docs/map-view.png', 'image'],
    ['photo.JPEG', 'image'],
    ['docs/report.pdf', 'binary'],
    ['fonts/Inter.woff2', 'binary'],
    ['web/src/App.tsx', 'text'],
    ['LICENSE', 'text'],
  ])('reads %s as %s', (filename, expected) => {
    expect(kindOf(filename)).toBe(expected)
  })
})

describe('binaryLabel', () => {
  it('names a format the browser cannot show', () => {
    expect(binaryLabel('docs/report.pdf')).toBe('PDF')
  })

  it('is null for anything it has no better word for', () => {
    expect(binaryLabel('web/src/App.tsx')).toBeNull()
  })
})
