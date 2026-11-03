import { useMemo } from 'react'
import type { ChangedFile } from '../api/types'
import { buildGraph, type EdgeKind } from './buildGraph'
import { fileLabel, moduleLabel } from './labels'
import { edgePath, heightFor, placeColumn } from './layout'

/** Added, removed and moved, in the same vocabulary the map's colours use. */
const EDGE_COLOUR: Record<EdgeKind, string> = {
  added: '#2da44e',
  removed: '#cf222e',
  moved: '#8250df',
}

const LEFT_X = 8
const RIGHT_X = 92

export function EdgeGraph({ files }: { files: ChangedFile[] }) {
  const graph = useMemo(() => buildGraph(files), [files])

  if (graph.edges.length === 0) {
    return (
      <p className="fallback">
        This pull request adds and removes no import lines, so there is nothing to draw here. The
        map has the whole of what changed.
      </p>
    )
  }

  const height = heightFor(graph.importers.length, graph.modules.length)
  const importers = placeColumn(graph.importers, LEFT_X, height)
  const modules = placeColumn(graph.modules, RIGHT_X, height)

  const importerY = new Map(importers.map((node) => [node.name, node.y]))
  const moduleY = new Map(modules.map((node) => [node.name, node.y]))

  return (
    <div className="edges">
      <svg
        viewBox={`0 0 100 ${height}`}
        height={height}
        preserveAspectRatio="none"
        role="group"
        aria-label={`${graph.edges.length} import changes`}
      >
        {graph.edges.map((edge) => (
          <path
            key={`${edge.from}->${edge.to}`}
            d={edgePath(LEFT_X, importerY.get(edge.from) ?? 0, RIGHT_X, moduleY.get(edge.to) ?? 0)}
            fill="none"
            stroke={EDGE_COLOUR[edge.kind]}
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
            strokeDasharray={edge.kind === 'removed' ? '3 2' : undefined}
          />
        ))}
      </svg>

      <ul className="importers">
        {importers.map((node) => (
          <li key={node.name} style={{ top: node.y }} title={node.name}>
            {fileLabel(node.name)}
          </li>
        ))}
      </ul>

      <ul className="modules">
        {modules.map((node) => (
          <li
            key={node.name}
            className={node.internal ? 'internal' : 'external'}
            style={{ top: node.y }}
            title={node.internal ? node.name : `${node.name} (package)`}
          >
            {moduleLabel(node.name)}
          </li>
        ))}
      </ul>
    </div>
  )
}
