import { describe, expect, it } from 'vitest'
import type { ChangedFile } from '../api/types'
import { fileLabel, moduleLabel } from './labels'
import { buildGraph } from './buildGraph'

function file(filename: string, ...lines: string[]): ChangedFile {
  return {
    filename,
    status: 'modified',
    additions: 0,
    deletions: 0,
    patch: ['@@ -1,10 +1,10 @@', ...lines].join('\n'),
    previousFilename: null,
    changes: lines.length,
    hasPatch: true,
  }
}

describe('buildGraph', () => {
  it('draws an added import as an added edge', () => {
    const graph = buildGraph([file('src/App.tsx', "+import { Panel } from './diff/Panel'")])

    expect(graph.edges).toEqual([
      { from: 'src/App.tsx', to: './diff/Panel', kind: 'added', internal: true },
    ])
  })

  it('collapses a removed and re-added import into one moved edge', () => {
    // A path rewritten reads as remove-then-add in the patch; two opposing arrows would say a
    // dependency both left and arrived.
    const graph = buildGraph([
      file('src/App.tsx', "-import { Map } from './Map'", "+import { Map } from './Map'"),
    ])

    expect(graph.edges).toHaveLength(1)
    expect(graph.edges[0].kind).toBe('moved')
  })

  it('keeps separate specifiers as separate edges', () => {
    const graph = buildGraph([
      file('src/App.tsx', "-import { Map } from './old/Map'", "+import { Map } from './new/Map'"),
    ])

    expect(graph.edges.map((e) => [e.to, e.kind])).toEqual([
      ['./old/Map', 'removed'],
      ['./new/Map', 'added'],
    ])
  })

  it('weighs a module by how many files import it, heaviest first', () => {
    const graph = buildGraph([
      file('src/one.ts', "+import { x } from './shared'"),
      file('src/two.ts', "+import { y } from './shared'"),
      file('src/three.ts', "+import { z } from './lonely'"),
    ])

    expect(graph.modules.map((m) => [m.name, m.weight])).toEqual([
      ['./shared', 2],
      ['./lonely', 1],
    ])
  })

  it('puts internal modules above the external band', () => {
    const graph = buildGraph([
      file('src/one.ts', "+import React from 'react'", "+import React from 'react'"),
      file('src/two.ts', "+import { x } from './x'"),
    ])

    expect(graph.modules[0].internal).toBe(true)
    expect(graph.modules.at(-1)?.name).toBe('react')
  })

  it('has an empty graph for a pull request that touches no imports', () => {
    const graph = buildGraph([file('README.md', '+Some prose.')])

    expect(graph.edges).toEqual([])
    expect(graph.importers).toEqual([])
    expect(graph.modules).toEqual([])
  })
})

describe('labels', () => {
  it('names a file by its own filename, not its extension', () => {
    expect(fileLabel('web/src/diff/DiffPanel.tsx')).toBe('DiffPanel.tsx')
  })

  it('names a relative module by its last path segment', () => {
    expect(moduleLabel('./diff/parsePatch')).toBe('parsePatch')
    expect(moduleLabel('../api/types')).toBe('types')
  })

  it('names a namespace by its last segment', () => {
    expect(moduleLabel('PrMap.Api.Auth')).toBe('Auth')
  })

  it('leaves a package name whole', () => {
    expect(moduleLabel('react')).toBe('react')
    expect(moduleLabel('d3-hierarchy')).toBe('d3-hierarchy')
  })
})
