import type { ChangedFile } from '../api/types'
import { parsePatch, type Hunk } from './parsePatch'

export type Preview =
  | { kind: 'patch'; hunks: Hunk[] }
  /** Lines changed, but GitHub sent no patch, so the diff was too large to include. */
  | { kind: 'too-big' }
  /** No patch and no lines changed: a binary file, or one GitHub declined to diff. */
  | { kind: 'none' }

/**
 * What the panel can show for one file.
 *
 * A missing patch cannot be read as "binary": GitHub omits it both for oversized diffs and for
 * files it declines to diff at all, and the response carries nothing separating the two. The
 * only signal available is whether any lines changed.
 */
export function previewFor(file: ChangedFile): Preview {
  if (file.hasPatch) return { kind: 'patch', hunks: parsePatch(file.patch) }
  if (file.changes > 0) return { kind: 'too-big' }
  return { kind: 'none' }
}
