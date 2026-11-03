import type { ChangedFile } from '../api/types'
import { parseImports } from './parseImports'

export type EdgeKind = 'added' | 'removed' | 'moved'

export type Edge = {
  from: string
  to: string
  kind: EdgeKind
  internal: boolean
}

export type ModuleNode = {
  /** The specifier, which is what the importing file wrote. */
  name: string
  internal: boolean
  /** How many edges land here, used to order the column. */
  weight: number
}

export type ImportGraph = {
  /** Files that gained or lost an import, busiest first. */
  importers: { name: string; weight: number }[]
  /** Modules imported, internal first and each group busiest first. */
  modules: ModuleNode[]
  edges: Edge[]
}

export const EMPTY_GRAPH: ImportGraph = { importers: [], modules: [], edges: [] }

/**
 * The import changes as a graph. A specifier a file both removed and added — a path rewritten,
 * an import reordered through a barrel file — collapses into one `moved` edge: two arrows
 * pointing opposite ways would say a dependency left and arrived, when what happened is that it
 * changed shape.
 */
export function buildGraph(files: ChangedFile[]): ImportGraph {
  const changes = parseImports(files)
  if (changes.length === 0) return EMPTY_GRAPH

  const byPair = new Map<string, Edge>()

  for (const change of changes) {
    const key = `${change.from}\u0000${change.specifier}`
    const existing = byPair.get(key)
    const kind: EdgeKind = change.direction === 'add' ? 'added' : 'removed'

    if (!existing) {
      byPair.set(key, {
        from: change.from,
        to: change.specifier,
        kind,
        internal: change.internal,
      })
      continue
    }

    if (existing.kind !== kind) {
      existing.kind = 'moved'
    }
  }

  const edges = [...byPair.values()]

  return {
    importers: weigh(edges.map((edge) => edge.from)).map(([name, weight]) => ({ name, weight })),
    modules: moduleNodes(edges),
    edges,
  }
}

function moduleNodes(edges: Edge[]): ModuleNode[] {
  const internal = new Map<string, boolean>()
  for (const edge of edges) {
    internal.set(edge.to, edge.internal)
  }

  return weigh(edges.map((edge) => edge.to))
    .map(([name, weight]) => ({ name, weight, internal: internal.get(name) ?? false }))
    // Internal modules first: they are the shape of this repository, and a package band below
    // keeps a dependency bump from pushing the repository's own structure off the top.
    .sort((a, b) => Number(b.internal) - Number(a.internal))
}

/** Counts each name, heaviest first, ties broken by first appearance so the order is stable. */
function weigh(names: string[]): [string, number][] {
  const counts = new Map<string, number>()
  for (const name of names) {
    counts.set(name, (counts.get(name) ?? 0) + 1)
  }

  return [...counts.entries()].sort((a, b) => b[1] - a[1])
}
