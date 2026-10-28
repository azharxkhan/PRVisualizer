/**
 * Colour says what happened to a file, never how much changed — area already carries that.
 * GitHub documents seven statuses; anything else lands on the neutral rather than disappearing.
 */
const COLOURS: Record<string, string> = {
  added: '#2da44e',
  removed: '#cf222e',
  modified: '#9a6700',
  renamed: '#8250df',
  copied: '#57606a',
  changed: '#9a6700',
  unchanged: '#57606a',
}

const NEUTRAL = '#57606a'

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
