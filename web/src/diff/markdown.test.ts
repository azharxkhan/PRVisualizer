import { describe, expect, it } from 'vitest'
import { renderMarkdown } from './markdown'

describe('renderMarkdown', () => {
  it('renders headings, lists and code', () => {
    const html = renderMarkdown('# Title\n\n- one\n- two\n\n`code`')

    expect(html).toContain('<h1>Title</h1>')
    expect(html).toContain('<li>one</li>')
    expect(html).toContain('<code>code</code>')
  })

  it('renders a GitHub-flavoured table', () => {
    const html = renderMarkdown('| a | b |\n| --- | --- |\n| 1 | 2 |')

    expect(html).toContain('<table>')
    expect(html).toContain('<th>a</th>')
  })

  // Markdown from a stranger's repository is untrusted input, so these are the rules that matter.
  it('drops raw HTML rather than passing it through', () => {
    const html = renderMarkdown('<script>alert(1)</script>\n\nafter')

    expect(html).not.toContain('<script>')
    expect(html).toContain('after')
  })

  it('drops an inline event handler', () => {
    expect(renderMarkdown('<img src=x onerror="alert(1)">')).not.toContain('onerror')
  })

  it('refuses a javascript: link, keeping only its text', () => {
    const html = renderMarkdown('[click](javascript:alert(1))')

    expect(html).not.toContain('javascript:')
    expect(html).toContain('click')
  })

  it('refuses a javascript: image source', () => {
    expect(renderMarkdown('![x](javascript:alert(1))')).not.toContain('javascript:')
  })

  it('keeps an ordinary https link and opens it in a new tab', () => {
    const html = renderMarkdown('[docs](https://example.com/a)')

    expect(html).toContain('href="https://example.com/a"')
    expect(html).toContain('rel="noreferrer noopener"')
  })

  it('escapes a title rather than letting it close the attribute', () => {
    const html = renderMarkdown('[x](https://example.com "a\\" onmouseover=\\"alert(1)")')

    expect(html).not.toContain('onmouseover="alert(1)"')
  })
})
