/** What a file is, as far as the panel is concerned, worked out from its extension. */
export type FileKind = 'markdown' | 'image' | 'svg' | 'binary' | 'text'

const IMAGE = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'avif', 'bmp', 'ico'])
const MARKDOWN = new Set(['md', 'markdown', 'mdx'])

/**
 * Extensions GitHub will not diff and the browser cannot render either. Naming them lets the
 * panel say "this is a PDF" rather than the vague "no preview available" it used to.
 */
const BINARY: Record<string, string> = {
  pdf: 'PDF',
  zip: 'archive',
  gz: 'archive',
  tar: 'archive',
  '7z': 'archive',
  rar: 'archive',
  woff: 'font',
  woff2: 'font',
  ttf: 'font',
  otf: 'font',
  eot: 'font',
  mp4: 'video',
  mov: 'video',
  webm: 'video',
  mp3: 'audio',
  wav: 'audio',
  ogg: 'audio',
  dll: 'binary',
  exe: 'binary',
  so: 'binary',
  dylib: 'binary',
  pdb: 'binary',
  bin: 'binary',
  db: 'database',
  sqlite: 'database',
  xlsx: 'spreadsheet',
  xls: 'spreadsheet',
  docx: 'document',
  pptx: 'presentation',
}

export function extensionOf(filename: string): string {
  const dot = filename.lastIndexOf('.')
  const slash = filename.lastIndexOf('/')
  if (dot === -1 || dot < slash || dot === filename.length - 1) return ''
  return filename.slice(dot + 1).toLowerCase()
}

export function kindOf(filename: string): FileKind {
  const extension = extensionOf(filename)
  if (MARKDOWN.has(extension)) return 'markdown'
  if (extension === 'svg') return 'svg'
  if (IMAGE.has(extension)) return 'image'
  if (extension in BINARY) return 'binary'
  return 'text'
}

/** A human word for a format the browser cannot show, or null when there is no better word. */
export function binaryLabel(filename: string): string | null {
  return BINARY[extensionOf(filename)] ?? null
}
