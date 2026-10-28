import type { ChangedFile } from '../api/types'

/** The label for files sitting at the repository root, which have no folder of their own. */
export const ROOT_FOLDER = '/'

export type FolderNode = {
  kind: 'folder'
  name: string
  children: TreeNode[]
}

export type FileNode = {
  kind: 'file'
  name: string
  file: ChangedFile
}

export type TreeNode = FolderNode | FileNode

/**
 * Nests the flat file list inside the folders the paths describe, so a folder that took heavy
 * change becomes a heavy region of the map. Folders keep the order their first file appeared in,
 * which is the order GitHub returned.
 */
export function groupByFolder(files: ChangedFile[]): FolderNode {
  const root: FolderNode = { kind: 'folder', name: '', children: [] }

  for (const file of files) {
    const segments = file.filename.split('/').filter((segment) => segment !== '')
    const name = segments.pop()

    // A path that is nothing but slashes has no file to show.
    if (name === undefined) continue

    const folders = segments.length === 0 ? [ROOT_FOLDER] : segments
    let parent = root

    for (const folder of folders) {
      const existing = parent.children.find(
        (child): child is FolderNode => child.kind === 'folder' && child.name === folder,
      )

      if (existing) {
        parent = existing
      } else {
        const created: FolderNode = { kind: 'folder', name: folder, children: [] }
        parent.children.push(created)
        parent = created
      }
    }

    parent.children.push({ kind: 'file', name, file })
  }

  // The root is the canvas itself, so only the folders inside it fold.
  return { ...root, children: root.children.map(collapseChild) }
}

function collapseChild(node: TreeNode): TreeNode {
  return node.kind === 'folder' ? collapse(node) : node
}

/**
 * Folds a chain of folders that each hold nothing but the next one into a single node, so
 * src/coreclr/tools/aot reads as one label instead of four nested frames. Monorepo paths are
 * mostly such chains, and each frame costs a label strip the files could have used.
 */
function collapse(folder: FolderNode): FolderNode {
  let current = folder

  while (current.children.length === 1 && current.children[0].kind === 'folder') {
    const only = current.children[0]
    current = {
      kind: 'folder',
      name: current.name === '' ? only.name : `${current.name}/${only.name}`,
      children: only.children,
    }
  }

  return { ...current, children: current.children.map(collapseChild) }
}

/**
 * The top-level folder carrying the most changed lines, for the summary bar. Ties go to the one
 * that appeared first, so the answer is stable across reloads.
 */
export function heaviestFolder(files: ChangedFile[]): { name: string; changes: number } | null {
  const totals = new Map<string, number>()

  for (const file of files) {
    const segments = file.filename.split('/').filter((segment) => segment !== '')
    const folder = segments.length > 1 ? segments[0] : ROOT_FOLDER
    totals.set(folder, (totals.get(folder) ?? 0) + file.changes)
  }

  let heaviest: { name: string; changes: number } | null = null
  for (const [name, changes] of totals) {
    if (heaviest === null || changes > heaviest.changes) heaviest = { name, changes }
  }

  return heaviest
}
