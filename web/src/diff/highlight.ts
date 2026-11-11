import Prism from 'prismjs'

// Order matters: Prism components extend the ones they are built on, so clike has to be loaded
// before csharp, javascript before jsx, and both before tsx. Core already brings markup, css,
// clike and javascript, so the list below starts after those.
import 'prismjs/components/prism-typescript'
import 'prismjs/components/prism-jsx'
import 'prismjs/components/prism-tsx'
import 'prismjs/components/prism-csharp'
import 'prismjs/components/prism-java'
import 'prismjs/components/prism-kotlin'
import 'prismjs/components/prism-python'
import 'prismjs/components/prism-rust'
import 'prismjs/components/prism-go'
import 'prismjs/components/prism-c'
import 'prismjs/components/prism-cpp'
import 'prismjs/components/prism-json'
import 'prismjs/components/prism-yaml'
import 'prismjs/components/prism-toml'
import 'prismjs/components/prism-ini'
import 'prismjs/components/prism-bash'
import 'prismjs/components/prism-sql'
import 'prismjs/components/prism-markdown'

import { extensionOf } from './fileKind'

/** Extension to Prism language. Anything absent is rendered as plain text, not guessed at. */
const LANGUAGES: Record<string, string> = {
  ts: 'typescript',
  mts: 'typescript',
  cts: 'typescript',
  tsx: 'tsx',
  js: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  jsx: 'jsx',
  cs: 'csharp',
  csx: 'csharp',
  java: 'java',
  kt: 'kotlin',
  kts: 'kotlin',
  py: 'python',
  pyi: 'python',
  rs: 'rust',
  go: 'go',
  c: 'c',
  h: 'c',
  cc: 'cpp',
  cpp: 'cpp',
  cxx: 'cpp',
  hpp: 'cpp',
  hh: 'cpp',
  hxx: 'cpp',
  json: 'json',
  jsonc: 'json',
  yml: 'yaml',
  yaml: 'yaml',
  toml: 'toml',
  ini: 'ini',
  editorconfig: 'ini',
  sh: 'bash',
  bash: 'bash',
  zsh: 'bash',
  sql: 'sql',
  md: 'markdown',
  markdown: 'markdown',
  html: 'markup',
  htm: 'markup',
  xml: 'markup',
  svg: 'markup',
  csproj: 'markup',
  props: 'markup',
  targets: 'markup',
  slnx: 'markup',
  css: 'css',
}

/** The Prism language for a path, or null when nothing here can colour it honestly. */
export function languageFor(filename: string): string | null {
  const language = LANGUAGES[extensionOf(filename)]
  return language && language in Prism.languages ? language : null
}

/**
 * Highlighted HTML for a piece of code, or null when the language is unknown — the caller then
 * renders the plain text, which React escapes for it.
 *
 * Prism escapes everything it does not turn into a token, so its output is safe to inject. The
 * input is repository source either way, never anything this app composes.
 */
export function highlight(code: string, language: string | null): string | null {
  if (language === null) return null

  const grammar = Prism.languages[language]
  if (!grammar) return null

  try {
    return Prism.highlight(code, grammar, language)
  } catch {
    // A grammar that throws on odd input should cost the colour, not the view.
    return null
  }
}
