import { describe, expect, it } from 'vitest'
import { highlight, languageFor } from './highlight'

describe('languageFor', () => {
  it.each([
    ['web/src/App.tsx', 'tsx'],
    ['web/src/api/types.ts', 'typescript'],
    ['api/Program.cs', 'csharp'],
    ['main.py', 'python'],
    ['src/lib.rs', 'rust'],
    ['cmd/main.go', 'go'],
    ['src/Engine.cpp', 'cpp'],
    ['src/engine.h', 'c'],
    ['App.java', 'java'],
    ['build.gradle.kts', 'kotlin'],
    ['package.json', 'json'],
    ['.github/workflows/ci.yml', 'yaml'],
    ['README.md', 'markdown'],
    ['PrMap.Api.csproj', 'markup'],
    ['docs/architecture.svg', 'markup'],
    ['web/src/App.css', 'css'],
  ])('maps %s to %s', (filename, expected) => {
    expect(languageFor(filename)).toBe(expected)
  })

  it('is null for a file it cannot colour honestly, rather than guessing', () => {
    expect(languageFor('LICENSE')).toBeNull()
    expect(languageFor('data.bin')).toBeNull()
    expect(languageFor('notes.txt')).toBeNull()
  })
})

describe('highlight', () => {
  it('wraps keywords and strings in tokens', () => {
    const html = highlight('const x = "hi"', 'javascript')

    expect(html).toContain('token keyword')
    expect(html).toContain('token string')
  })

  it('returns null for no language, so the caller renders plain text', () => {
    expect(highlight('anything', null)).toBeNull()
  })

  it('returns null for a language that was never loaded', () => {
    expect(highlight('anything', 'brainfuck')).toBeNull()
  })

  // Prism's output is injected as HTML, so what it does with angle brackets matters.
  it('escapes markup in the source rather than emitting it', () => {
    const html = highlight('<script>alert(1)</script>', 'javascript')

    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;')
  })

  it('escapes an unterminated tag in plain-looking code', () => {
    const html = highlight('x = "<img src=y onerror=z>"', 'javascript')

    expect(html).not.toContain('<img')
  })

  it('keeps the code itself intact', () => {
    const html = highlight('let total = 42', 'javascript')

    expect(html).toContain('total')
    expect(html).toContain('42')
  })
})
