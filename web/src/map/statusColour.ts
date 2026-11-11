/**
 * Colour says what happened to a file, never how much changed — area already carries that.
 * The four everyday statuses sit on four clearly different hues, so the map can be read at a
 * glance rather than decoded; green and the old mustard were too close to tell apart quickly.
 * GitHub documents seven statuses; anything else lands on the neutral rather than disappearing.
 */
const COLOURS: Record<string, string> = {
  added: '#2f9e44',
  removed: '#e5484d',
  modified: '#d97706',
  renamed: '#8b5cf6',
  copied: '#6b7280',
  changed: '#d97706',
  unchanged: '#6b7280',
}

const NEUTRAL = '#6b7280'

export function statusColour(status: string): string {
  return COLOURS[status] ?? NEUTRAL
}

/** The legend under the map, in the order the colours above are defined. */
export const LEGEND: ReadonlyArray<{ status: string; label: string }> = [
  { status: 'added', label: 'added' },
  { status: 'modified', label: 'modified' },
  { status: 'removed', label: 'removed' },
  { status: 'renamed', label: 'renamed' },
]
