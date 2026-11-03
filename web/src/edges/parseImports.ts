import type { ChangedFile } from '../api/types'
import { parsePatch } from '../diff/parsePatch'

export type ImportChange = {
  /** The file doing the importing. */
  from: string
  /** The specifier as written: './preview', 'react', 'PrMap.Api.Auth'. */
  specifier: string
  /** Whether the line was added or removed in this pull request. */
  direction: 'add' | 'remove'
  /** False for a package outside the repository. */
  internal: boolean
}

/** import x from 'y', import 'y', export { x } from 'y' — the specifier is the quoted part. */
const JS_FROM = /(?:^|\s)(?:import|export)\b[^'"]*?from\s*['"]([^'"]+)['"]/
const JS_BARE = /^\s*import\s*['"]([^'"]+)['"]/
const JS_REQUIRE = /require\(\s*['"]([^'"]+)['"]\s*\)/
/** The closing line of a multi-line import, where the specifier sits without its import keyword. */
const JS_CONTINUATION = /^\s*\}\s*from\s*['"]([^'"]+)['"]/

/** using A.B.C; global using A.B; using Alias = A.B.C; — never `using (var x = …)`. */
const CS_USING = /^\s*(?:global\s+)?using\s+(?:static\s+)?(?:[A-Za-z_][\w]*\s*=\s*)?([A-Za-z_][\w.]*)\s*;/

const JS_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']

function languageOf(filename: string): 'js' | 'cs' | null {
  const lower = filename.toLowerCase()
  if (JS_EXTENSIONS.some((extension) => lower.endsWith(extension))) return 'js'
  if (lower.endsWith('.cs')) return 'cs'
  return null
}

/** A line whose code is commented out still parses as an import otherwise. */
function isComment(line: string): boolean {
  const trimmed = line.trimStart()
  return trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')
}

function specifierIn(line: string, language: 'js' | 'cs'): string | null {
  if (isComment(line)) return null

  if (language === 'cs') {
    return CS_USING.exec(line)?.[1] ?? null
  }

  return (
    JS_FROM.exec(line)?.[1] ??
    JS_BARE.exec(line)?.[1] ??
    JS_REQUIRE.exec(line)?.[1] ??
    JS_CONTINUATION.exec(line)?.[1] ??
    null
  )
}

/**
 * The namespaces the repository declares itself. A `using` of one of those is internal; anything
 * else is a package, which is how System.* and Octokit sort themselves out without a list of
 * known framework names to maintain.
 */
function ownNamespaces(files: ChangedFile[]): Set<string> {
  const roots = new Set<string>()

  for (const file of files) {
    if (languageOf(file.filename) !== 'cs') continue

    for (const hunk of parsePatch(file.patch)) {
      for (const line of hunk.lines) {
        const declared = /^\s*namespace\s+([A-Za-z_][\w]*)/.exec(line.content)
        if (declared) roots.add(declared[1])
      }
    }
  }

  return roots
}

/**
 * Import lines the pull request added or removed. Context lines are left alone: they are the
 * imports that did not change, and drawing them would be a picture of the repository rather
 * than of the change.
 */
export function parseImports(files: ChangedFile[]): ImportChange[] {
  const roots = ownNamespaces(files)
  const changes: ImportChange[] = []

  for (const file of files) {
    const language = languageOf(file.filename)
    if (language === null) continue

    for (const hunk of parsePatch(file.patch)) {
      for (const line of hunk.lines) {
        if (line.kind === 'context') continue

        const specifier = specifierIn(line.content, language)
        if (specifier === null) continue

        changes.push({
          from: file.filename,
          specifier,
          direction: line.kind,
          internal: isInternal(specifier, language, roots),
        })
      }
    }
  }

  return changes
}

export function isInternal(
  specifier: string,
  language: 'js' | 'cs',
  ownRoots: Set<string>,
): boolean {
  if (language === 'js') return specifier.startsWith('.') || specifier.startsWith('/')

  return ownRoots.has(specifier.split('.')[0])
}
