export type Placed<T> = T & { x: number; y: number }

/** Row pitch, and the smallest frame the graph is drawn in. */
export const ROW_HEIGHT = 26
export const MIN_HEIGHT = 120

/**
 * Lays a column of nodes out evenly down the available height. Nodes are centred as a block, so
 * a graph with three edges sits in the middle of the frame rather than clinging to the top.
 */
export function placeColumn<T>(nodes: T[], x: number, height: number): Placed<T>[] {
  if (nodes.length === 0) return []

  const pitch = Math.min(ROW_HEIGHT, height / (nodes.length + 1))
  const top = (height - pitch * (nodes.length - 1)) / 2

  return nodes.map((node, index) => ({ ...node, x, y: top + index * pitch }))
}

/** The height the frame needs for the busier of the two columns. */
export function heightFor(importers: number, modules: number): number {
  return Math.max(MIN_HEIGHT, (Math.max(importers, modules) + 1) * ROW_HEIGHT)
}

/** A cubic curve from one node to another, flat enough to read as a connection, not a loop. */
export function edgePath(x1: number, y1: number, x2: number, y2: number): string {
  const bend = (x2 - x1) / 2
  return `M ${x1} ${y1} C ${x1 + bend} ${y1}, ${x2 - bend} ${y2}, ${x2} ${y2}`
}
