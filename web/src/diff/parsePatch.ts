export type DiffLineKind = 'add' | 'remove' | 'context'

export type DiffLine = {
  kind: DiffLineKind
  /** Line number in the file before the change, or null for an added line. */
  oldNumber: number | null
  /** Line number in the file after the change, or null for a removed line. */
  newNumber: number | null
  /** The line without its leading +, - or space. */
  content: string
}

export type Hunk = {
  /** The @@ line as GitHub wrote it, section heading and all. */
  header: string
  lines: DiffLine[]
}

/** @@ -oldStart,oldCount +newStart,newCount @@ optional section heading */
const HUNK_HEADER = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/

/**
 * Turns GitHub's unified diff into hunks of numbered lines. A patch GitHub sends is already
 * well formed, but a header this cannot read is shown as context rather than throwing: a diff
 * rendered plainly beats a panel that fails.
 */
export function parsePatch(patch: string | null): Hunk[] {
  if (!patch) return []

  const hunks: Hunk[] = []
  let current: Hunk | null = null
  let oldNumber = 0
  let newNumber = 0

  for (const line of patch.split('\n')) {
    const header = HUNK_HEADER.exec(line)

    if (header) {
      current = { header: line, lines: [] }
      hunks.push(current)
      oldNumber = Number(header[1])
      newNumber = Number(header[3])
      continue
    }

    // Anything before the first @@ is not part of a hunk.
    if (!current) continue

    // GitHub marks a file whose last line has no newline. It describes the line above, so it
    // belongs in the panel's text no more than the @@ header does.
    if (line.startsWith('\\')) continue

    if (line.startsWith('+')) {
      current.lines.push({
        kind: 'add',
        oldNumber: null,
        newNumber: newNumber++,
        content: line.slice(1),
      })
    } else if (line.startsWith('-')) {
      current.lines.push({
        kind: 'remove',
        oldNumber: oldNumber++,
        newNumber: null,
        content: line.slice(1),
      })
    } else {
      current.lines.push({
        kind: 'context',
        oldNumber: oldNumber++,
        newNumber: newNumber++,
        // A context line carries a leading space; the last line of a patch can be empty.
        content: line.startsWith(' ') ? line.slice(1) : line,
      })
    }
  }

  return hunks
}
