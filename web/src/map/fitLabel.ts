/**
 * SVG text does not clip to anything: a label wider than its cell is simply drawn over the
 * neighbouring cells, which is how `SalesMcp.Application.csproj` ended up lying across three
 * boxes. So labels are measured and cut to fit before they are drawn.
 *
 * The cut keeps the extension where there is one, because `SalesMcp.App…` and
 * `SalesMcp.App….csproj` answer different questions, and the extension is usually the part
 * that says what kind of file this is.
 */

/** Text wider than this many characters is not worth measuring one prefix at a time. */
export type Measure = (text: string) => number

const ELLIPSIS = '…'

export function fitLabel(text: string, maxWidth: number, measure: Measure): string {
  if (maxWidth <= 0 || text === '') return ''
  if (measure(text) <= maxWidth) return text

  const dot = text.lastIndexOf('.')
  // Only a short, trailing extension is worth keeping; ".Application.Tests.csproj" is not one.
  const tail = dot > 0 && text.length - dot <= 8 ? text.slice(dot) : ''
  const body = tail === '' ? text : text.slice(0, dot)

  // The shortest thing worth drawing is one character, the ellipsis and the extension.
  if (measure(text.slice(0, 1) + ELLIPSIS + tail) > maxWidth) {
    // No room for a useful cut: try the bare ellipsis, else draw nothing at all.
    return measure(ELLIPSIS) <= maxWidth ? ELLIPSIS : ''
  }

  // Binary search the longest head that still fits with the ellipsis and the extension.
  let low = 1
  let high = body.length

  while (low < high) {
    const middle = Math.ceil((low + high) / 2)
    if (measure(body.slice(0, middle) + ELLIPSIS + tail) <= maxWidth) low = middle
    else high = middle - 1
  }

  return body.slice(0, low) + ELLIPSIS + tail
}

/**
 * A canvas is the only honest way to measure proportional text, and it is cheap once the
 * context is made. Falling back to an estimate keeps this working where canvas is not
 * available, such as under a test runner with no DOM.
 */
export function measurerFor(font: string): Measure {
  const context = canvasContext()
  if (!context) {
    // 0.55em per character is close enough for a system sans at the sizes the map uses.
    const size = Number.parseFloat(font) || 12
    return (text) => text.length * size * 0.55
  }

  context.font = font
  const cache = new Map<string, number>()

  return (text) => {
    const cached = cache.get(text)
    if (cached !== undefined) return cached

    const width = context.measureText(text).width
    cache.set(text, width)
    return width
  }
}

let shared: CanvasRenderingContext2D | null | undefined

function canvasContext(): CanvasRenderingContext2D | null {
  if (shared !== undefined) return shared

  try {
    shared = document.createElement('canvas').getContext('2d')
  } catch {
    shared = null
  }

  return shared
}
