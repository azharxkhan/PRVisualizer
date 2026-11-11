import { marked, type Tokens } from 'marked'

/**
 * Markdown from a stranger's repository is untrusted input, and it reaches the page as HTML.
 * Two rules keep that safe without a sanitiser dependency:
 *
 * 1. Raw HTML in the source is dropped rather than passed through, which removes <script>,
 *    event-handler attributes and everything else an author could smuggle in.
 * 2. Link and image URLs must be http(s), so `javascript:` cannot survive a click.
 */
const renderer = new marked.Renderer()

renderer.html = () => ''

const escape = (text: string) =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

function safeUrl(href: string): string | null {
  try {
    const url = new URL(href, 'https://github.com')
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null
  } catch {
    return null
  }
}

renderer.link = ({ href, title, tokens }: Tokens.Link) => {
  const text = renderer.parser.parseInline(tokens)
  const safe = safeUrl(href)
  if (!safe) return text
  const label = title ? ` title="${escape(title)}"` : ''
  return `<a href="${escape(safe)}"${label} target="_blank" rel="noreferrer noopener">${text}</a>`
}

renderer.image = ({ href, title, text }: Tokens.Image) => {
  const safe = safeUrl(href)
  if (!safe) return escape(text)
  const label = title ? ` title="${escape(title)}"` : ''
  return `<img src="${escape(safe)}" alt="${escape(text)}"${label} loading="lazy" />`
}

/** Markdown to HTML, with the two rules above applied. */
export function renderMarkdown(source: string): string {
  return marked.parse(source, { renderer, async: false, gfm: true, breaks: false })
}
