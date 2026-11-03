import { describe, expect, it } from 'vitest'
import { MIN_HEIGHT, ROW_HEIGHT, edgePath, heightFor, placeColumn } from './layout'

const nodes = (count: number) => Array.from({ length: count }, (_, i) => ({ name: `n${i}` }))

describe('placeColumn', () => {
  it('centres a single node rather than parking it at the top', () => {
    const [only] = placeColumn(nodes(1), 10, 300)

    expect(only.y).toBe(150)
    expect(only.x).toBe(10)
  })

  it('never puts two nodes in the same place', () => {
    const placed = placeColumn(nodes(8), 0, 400)
    const ys = placed.map((p) => p.y)

    expect(new Set(ys).size).toBe(ys.length)
  })

  it('keeps every node inside the frame, however many there are', () => {
    const placed = placeColumn(nodes(40), 0, 300)

    expect(Math.min(...placed.map((p) => p.y))).toBeGreaterThanOrEqual(0)
    expect(Math.max(...placed.map((p) => p.y))).toBeLessThanOrEqual(300)
  })

  it('has nothing to place for an empty column', () => {
    expect(placeColumn([], 0, 300)).toEqual([])
  })
})

describe('heightFor', () => {
  it('grows with the busier column', () => {
    expect(heightFor(2, 10)).toBe(11 * ROW_HEIGHT)
  })

  it('never shrinks below a readable frame', () => {
    expect(heightFor(1, 1)).toBe(MIN_HEIGHT)
  })
})

describe('edgePath', () => {
  it('starts and ends where it is told', () => {
    expect(edgePath(0, 10, 100, 50)).toBe('M 0 10 C 50 10, 50 50, 100 50')
  })
})
