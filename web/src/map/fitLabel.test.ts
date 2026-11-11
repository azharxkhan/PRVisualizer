import { describe, expect, it } from 'vitest'
import { fitLabel, measurerFor } from './fitLabel'

/** A fixed-width measure, so the expectations are about the cut and not about a font. */
const perChar = (width: number) => (text: string) => text.length * width
const ten = perChar(10)

describe('fitLabel', () => {
  it('leaves a label that already fits alone', () => {
    expect(fitLabel('App.tsx', 200, ten)).toBe('App.tsx')
  })

  it('leaves a label that fits exactly alone', () => {
    expect(fitLabel('App.tsx', 70, ten)).toBe('App.tsx')
  })

  it('keeps the extension when it has to cut', () => {
    // 12 characters of room: the head is cut, the ellipsis and ".csproj" are kept.
    const fitted = fitLabel('SalesMcp.Application.csproj', 120, ten)

    expect(fitted.endsWith('.csproj')).toBe(true)
    expect(fitted).toContain('…')
    expect(ten(fitted)).toBeLessThanOrEqual(120)
  })

  it('never returns something wider than the room given', () => {
    for (const width of [0, 5, 13, 24, 37, 60, 95, 140]) {
      expect(ten(fitLabel('SalesMcp.Application.Tests.csproj', width, ten))).toBeLessThanOrEqual(
        width,
      )
    }
  })

  it('cuts a name with no extension too', () => {
    const fitted = fitLabel('LICENSEANDOTHERTHINGS', 50, ten)

    expect(fitted).toBe('LICE…')
    expect(ten(fitted)).toBeLessThanOrEqual(50)
  })

  it('treats a long multi-dot suffix as part of the name, not an extension', () => {
    // ".Application.Tests.csproj" is too long to be worth preserving whole.
    const fitted = fitLabel('SalesMcp.Application.Tests.csproj', 100, ten)

    expect(fitted.endsWith('.csproj')).toBe(true)
    expect(ten(fitted)).toBeLessThanOrEqual(100)
  })

  it('falls back to a bare ellipsis when there is room for nothing else', () => {
    expect(fitLabel('App.tsx', 15, ten)).toBe('…')
  })

  it('draws nothing when even the ellipsis will not fit', () => {
    expect(fitLabel('App.tsx', 5, ten)).toBe('')
  })

  it('draws nothing for no room at all', () => {
    expect(fitLabel('App.tsx', 0, ten)).toBe('')
    expect(fitLabel('App.tsx', -20, ten)).toBe('')
  })

  it('handles an empty label', () => {
    expect(fitLabel('', 100, ten)).toBe('')
  })

  it('handles a dotfile, where the dot is first and is not an extension', () => {
    const fitted = fitLabel('.gitignore', 50, ten)

    expect(ten(fitted)).toBeLessThanOrEqual(50)
    expect(fitted).toContain('…')
  })
})

describe('measurerFor', () => {
  it('returns a measure that grows with the text, with or without a canvas', () => {
    const measure = measurerFor('12px sans-serif')

    expect(measure('AA')).toBeGreaterThan(measure('A'))
    expect(measure('')).toBe(0)
  })

  it('is stable when the same text is measured twice', () => {
    const measure = measurerFor('12px sans-serif')
    expect(measure('App.tsx')).toBe(measure('App.tsx'))
  })
})
