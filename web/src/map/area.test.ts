import { describe, expect, it } from 'vitest'
import { areaFor } from './area'

describe('areaFor', () => {
  const CANVAS = 600 * 600

  it('uses the changed lines when they are the larger number', () => {
    expect(areaFor(400, 25000, CANVAS)).toBe(400)
  })

  it('floors a binary file so its box is still visible and clickable', () => {
    // Without a floor the cell rounds away to zero pixels and cannot be clicked at all, even
    // though the panel has "no preview available" to say about it.
    const value = areaFor(0, 25000, CANVAS)

    expect(value).toBeGreaterThan(1)
    // The floor buys about 400px² of a 360,000px² canvas, so roughly a ninth of a percent.
    expect(value / 25000).toBeCloseTo(400 / CANVAS, 6)
  })

  it('shrinks the floor as the canvas grows, since a big canvas needs less help', () => {
    expect(areaFor(0, 25000, CANVAS * 4)).toBeLessThan(areaFor(0, 25000, CANVAS))
  })

  it('never returns zero, even before the canvas has been measured', () => {
    expect(areaFor(0, 0, 0)).toBe(1)
  })

  it('leaves a small pull request alone, where one line is already visible', () => {
    expect(areaFor(2, 200, CANVAS)).toBe(2)
  })
})
