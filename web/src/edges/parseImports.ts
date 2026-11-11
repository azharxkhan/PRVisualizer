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

/** import a.b.c / import a.b as c / from a.b import x / from . import x */
const PY_FROM = /^\s*from\s+(\.*[A-Za-z_][\w.]*|\.+)\s+import\s/
const PY_IMPORT = /^\s*import\s+([A-Za-z_][\w.]*)/

/** use std::io; use crate::a::b; use super::x; — the specifier is the path up to any brace. */
const RS_USE = /^\s*(?:pub\s+)?use\s+([A-Za-z_][\w:]*)/
const RS_EXTERN = /^\s*extern\s+crate\s+([A-Za-z_]\w*)/

/** A Go import is a quoted path, alone or inside an import ( … ) block, optionally aliased. */
const GO_IMPORT = /^\s*(?:import\s+)?(?:[A-Za-z_.]\w*\s+)?"([^"]+)"\s*$/

/** import a.b.C; import static a.b.C.d; */
const JAVA_IMPORT = /^\s*import\s+(?:static\s+)?([A-Za-z_][\w.]*)\s*;/

/** #include "local.h" or #include <vector>; the delimiter says which, so it is captured too. */
const C_INCLUDE = /^\s*#\s*include\s*(["<])([^>"]+)[>"]/

type Language = 'js' | 'cs' | 'py' | 'rs' | 'go' | 'java' | 'c'

const JS_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']
const C_EXTENSIONS = ['.c', '.h', '.cc', '.cpp', '.cxx', '.hpp', '.hh', '.hxx', '.ino']

const BY_EXTENSION: Record<string, Language> = {
  '.cs': 'cs',
  '.py': 'py',
  '.pyi': 'py',
  '.rs': 'rs',
  '.go': 'go',
  '.java': 'java',
  '.kt': 'java',
  '.kts': 'java',
}

function languageOf(filename: string): Language | null {
  const lower = filename.toLowerCase()
  if (JS_EXTENSIONS.some((extension) => lower.endsWith(extension))) return 'js'
  if (C_EXTENSIONS.some((extension) => lower.endsWith(extension))) return 'c'

  for (const [extension, language] of Object.entries(BY_EXTENSION)) {
    if (lower.endsWith(extension)) return language
  }

  return null
}

/**
 * A line whose code is commented out still parses as an import otherwise. The comment marker
 * depends on the language: `#` opens a comment in Python but opens an include in C.
 */
function isComment(line: string, language: Language): boolean {
  const trimmed = line.trimStart()
  if (language === 'py') return trimmed.startsWith('#')
  return trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')
}

function specifierIn(line: string, language: Language): string | null {
  if (isComment(line, language)) return null

  switch (language) {
    case 'cs':
      return CS_USING.exec(line)?.[1] ?? null
    case 'java':
      return JAVA_IMPORT.exec(line)?.[1] ?? null
    case 'py':
      return PY_FROM.exec(line)?.[1] ?? PY_IMPORT.exec(line)?.[1] ?? null
    case 'rs':
      // Rust paths carry the item too; the module is everything above the last segment.
      return RS_USE.exec(line)?.[1] ?? RS_EXTERN.exec(line)?.[1] ?? null
    case 'go':
      return GO_IMPORT.exec(line)?.[1] ?? null
    case 'c':
      return C_INCLUDE.exec(line)?.[2] ?? null
    default:
      return (
        JS_FROM.exec(line)?.[1] ??
        JS_BARE.exec(line)?.[1] ??
        JS_REQUIRE.exec(line)?.[1] ??
        JS_CONTINUATION.exec(line)?.[1] ??
        null
      )
  }
}

/**
 * The namespaces the repository declares itself. A `using` of one of those is internal; anything
 * else is a package, which is how System.* and Octokit sort themselves out without a list of
 * known framework names to maintain.
 */
function ownNamespaces(files: ChangedFile[]): Set<string> {
  const roots = new Set<string>()

  for (const file of files) {
    const language = languageOf(file.filename)
    if (language !== 'cs' && language !== 'java') continue

    const keyword = language === 'cs' ? 'namespace' : 'package'
    // Double backslashes: this is a template literal, where `\s` would collapse to a plain "s".
    const pattern = new RegExp(`^\\s*${keyword}\\s+([A-Za-z_]\\w*)`)

    for (const hunk of parsePatch(file.patch)) {
      for (const line of hunk.lines) {
        const declared = pattern.exec(line.content)
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
          internal:
            language === 'c'
              ? cIncludeIsLocal(line.content)
              : isInternal(specifier, language, roots),
        })
      }
    }
  }

  return changes
}

/**
 * `#include "x.h"` searches the project's own directories first; `#include <x>` is the system
 * include path. Only the line carries that distinction, so it is read there rather than from
 * the specifier, which has had its delimiters stripped.
 */
export function cIncludeIsLocal(line: string): boolean {
  return C_INCLUDE.exec(line)?.[1] === '"'
}

export function isInternal(
  specifier: string,
  language: Language,
  ownRoots: Set<string>,
): boolean {
  switch (language) {
    case 'js':
      return specifier.startsWith('.') || specifier.startsWith('/')
    case 'py':
      // A leading dot is a relative import; anything else may still be the project's own
      // top-level package, which the patch alone cannot tell from a site-packages name.
      return specifier.startsWith('.')
    case 'rs':
      // crate, super and self all name somewhere inside this crate.
      return /^(crate|super|self)\b/.test(specifier)
    case 'c':
      // Decided from the line, not the specifier: see cIncludeIsLocal.
      return false
    case 'go':
      // Go has no relative imports: every path is absolute, so nothing here is internal
      // without knowing the module name, which a patch does not carry.
      return false
    default:
      return ownRoots.has(specifier.split('.')[0])
  }
}
