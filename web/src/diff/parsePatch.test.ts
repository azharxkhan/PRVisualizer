import { describe, expect, it } from 'vitest'
import { parsePatch } from './parsePatch'

describe('parsePatch', () => {
  it('numbers context, additions and removals from the hunk header', () => {
    const [hunk] = parsePatch(['@@ -10,3 +10,4 @@ void Method()', ' keep', '-gone', '+new', '+also', ' tail'].join('\n'))

    expect(hunk.lines).toEqual([
      { kind: 'context', oldNumber: 10, newNumber: 10, content: 'keep' },
      { kind: 'remove', oldNumber: 11, newNumber: null, content: 'gone' },
      { kind: 'add', oldNumber: null, newNumber: 11, content: 'new' },
      { kind: 'add', oldNumber: null, newNumber: 12, content: 'also' },
      { kind: 'context', oldNumber: 12, newNumber: 13, content: 'tail' },
    ])
  })

  it('keeps the hunk header, section heading and all', () => {
    const [hunk] = parsePatch('@@ -1,1 +1,1 @@ class Thing\n-a\n+b')

    expect(hunk.header).toBe('@@ -1,1 +1,1 @@ class Thing')
  })

  it('splits a patch into one hunk per header', () => {
    const hunks = parsePatch(['@@ -1,1 +1,1 @@', '-a', '+b', '@@ -40,1 +40,1 @@', '-c', '+d'].join('\n'))

    expect(hunks).toHaveLength(2)
    expect(hunks[1].lines[0]).toMatchObject({ kind: 'remove', oldNumber: 40 })
  })

  it('reads the single-line form, where the count is left out', () => {
    const [hunk] = parsePatch('@@ -7 +7 @@\n-a\n+b')

    expect(hunk.lines).toEqual([
      { kind: 'remove', oldNumber: 7, newNumber: null, content: 'a' },
      { kind: 'add', oldNumber: null, newNumber: 7, content: 'b' },
    ])
  })

  it('drops the no-newline marker, which is about the line above', () => {
    const [hunk] = parsePatch('@@ -1 +1,2 @@\n-one\n\\ No newline at end of file\n+one\n+two')

    expect(hunk.lines.map((line) => line.content)).toEqual(['one', 'one', 'two'])
  })

  it('ignores anything before the first hunk header', () => {
    const hunks = parsePatch('diff --git a/x b/x\n--- a/x\n+++ b/x\n@@ -1 +1 @@\n-a\n+b')

    expect(hunks).toHaveLength(1)
    expect(hunks[0].lines).toHaveLength(2)
  })

  it('keeps an empty context line empty', () => {
    const [hunk] = parsePatch('@@ -1,2 +1,2 @@\n \n+added')

    expect(hunk.lines[0]).toEqual({ kind: 'context', oldNumber: 1, newNumber: 1, content: '' })
  })

  it('has nothing to show for a null or empty patch', () => {
    expect(parsePatch(null)).toEqual([])
    expect(parsePatch('')).toEqual([])
  })
})
