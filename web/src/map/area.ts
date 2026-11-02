/** Roughly 20x20: small enough to stay honest about size, big enough to see and click. */
const MIN_CELL_PX = 400

/**
 * The value a file contributes to the layout. A box's area is its share of the total, so a
 * binary file with no changed lines would be a zero-pixel cell: invisible, and impossible to
 * click even though the panel has something to say about it. Every file is floored at whatever
 * value buys it MIN_CELL_PX on this canvas, which keeps the distortion as small as the screen
 * allows rather than fixing it at some share of the pull request.
 */
export function areaFor(changes: number, totalChanges: number, canvasArea: number): number {
  const floor = canvasArea > 0 ? (totalChanges * MIN_CELL_PX) / canvasArea : 0
  return Math.max(changes, floor, 1)
}
