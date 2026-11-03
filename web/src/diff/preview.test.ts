import { describe, expect, it } from 'vitest'
import type { ChangedFile } from '../api/types'
import { previewFor } from './preview'

function file(overrides: Partial<ChangedFile>): ChangedFile {
  return {
    filename: 'src/one.cs',
    status: 'modified',
    additions: 1,
    deletions: 1,
    patch: '@@ -1 +1 @@\n-a\n+b',
    previousFilename: null,
    changes: 2,
    hasPatch: true,
    ...overrides,
  }
}

describe('previewFor', () => {
  it('parses the patch when GitHub sent one', () => {
    const preview = previewFor(file({}))

    expect(preview.kind).toBe('patch')
    expect(preview.kind === 'patch' && preview.hunks).toHaveLength(1)
  })

  it('calls a missing patch with changed lines too big, not binary', () => {
    expect(previewFor(file({ patch: null, hasPatch: false, additions: 4000, changes: 4000 })))
      .toEqual({ kind: 'too-big' })
  })

  it('has no preview for a file with no patch and no changed lines', () => {
    const binary = file({
      filename: 'docs/logo.png',
      patch: null,
      hasPatch: false,
      additions: 0,
      deletions: 0,
      changes: 0,
    })

    expect(previewFor(binary)).toEqual({ kind: 'none' })
  })

  it('still shows the patch for a renamed file that carries one', () => {
    const renamed = file({ status: 'renamed', previousFilename: 'src/old.cs' })

    expect(previewFor(renamed).kind).toBe('patch')
  })
})
