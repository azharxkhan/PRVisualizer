/** A file's own name, so web/src/diff/DiffPanel.tsx reads as DiffPanel.tsx and not as "tsx". */
export function fileLabel(path: string): string {
  return path.split('/').filter(Boolean).at(-1) ?? path
}

/**
 * The part of a specifier worth reading in a label: the last path segment for './diff/Panel',
 * the last namespace segment for 'PrMap.Api.Auth', and a package name left whole.
 */
export function moduleLabel(specifier: string): string {
  const path = specifier.split('/').filter(Boolean).at(-1) ?? specifier
  return path.includes('.') && !path.startsWith('.')
    ? (path.split('.').filter(Boolean).at(-1) ?? path)
    : path
}
