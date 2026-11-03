import { describe, expect, it } from 'vitest'
import type { ChangedFile } from '../api/types'
import { isInternal, parseImports } from './parseImports'

/** Builds a one-hunk patch whose lines are given with their +/-/space prefix. */
function file(filename: string, ...lines: string[]): ChangedFile {
  const patch = ['@@ -1,10 +1,10 @@', ...lines].join('\n')
  return {
    filename,
    status: 'modified',
    additions: lines.filter((l) => l.startsWith('+')).length,
    deletions: lines.filter((l) => l.startsWith('-')).length,
    patch,
    previousFilename: null,
    changes: lines.length,
    hasPatch: true,
  }
}

const specifiers = (files: ChangedFile[]) => parseImports(files).map((c) => c.specifier)

describe('parseImports, JavaScript and TypeScript', () => {
  it('reads a default and a named import', () => {
    const changes = parseImports([
      file('src/App.tsx', "+import React from 'react'", "+import { useState } from 'react'"),
    ])

    expect(changes.map((c) => c.specifier)).toEqual(['react', 'react'])
    expect(changes.every((c) => c.direction === 'add')).toBe(true)
  })

  it('reads a bare side-effect import', () => {
    expect(specifiers([file('src/App.tsx', "+import './App.css'")])).toEqual(['./App.css'])
  })

  it('reads a type-only import and a re-export', () => {
    expect(
      specifiers([
        file('src/x.ts', "+import type { Session } from './useSession'", "+export { y } from './y'"),
      ]),
    ).toEqual(['./useSession', './y'])
  })

  it('reads require()', () => {
    expect(specifiers([file('src/x.js', "+const fs = require('node:fs')")])).toEqual(['node:fs'])
  })

  it('takes the specifier from the line that carries from, in a multi-line import', () => {
    expect(
      specifiers([file('src/x.ts', '+import {', '+  one,', '+  two,', "+} from './pair'")]),
    ).toEqual(['./pair'])
  })

  it('ignores a commented-out import', () => {
    expect(specifiers([file('src/x.ts', "+// import { old } from './old'")])).toEqual([])
  })

  it('ignores prose that merely contains the word import', () => {
    expect(
      specifiers([file('src/x.ts', '+const message = "import the data first"')]),
    ).toEqual([])
  })

  it('marks a removed import as removed', () => {
    const [change] = parseImports([file('src/x.ts', "-import { gone } from './gone'")])

    expect(change.direction).toBe('remove')
  })

  it('leaves unchanged imports out, since they are not part of the change', () => {
    expect(specifiers([file('src/x.ts', " import { same } from './same'")])).toEqual([])
  })
})

describe('parseImports, C#', () => {
  it('reads a using, a global using and an alias', () => {
    expect(
      specifiers([
        file(
          'api/PrMap.Api/Program.cs',
          '+using PrMap.Api.Auth;',
          '+global using System.Linq;',
          '+using Files = PrMap.Api.Models.PullRequestFiles;',
        ),
      ]),
    ).toEqual(['PrMap.Api.Auth', 'System.Linq', 'PrMap.Api.Models.PullRequestFiles'])
  })

  it('does not mistake a using statement for a using directive', () => {
    expect(
      specifiers([file('api/x.cs', '+using (var stream = File.OpenRead(path))')]),
    ).toEqual([])
  })
})

describe('internal versus external', () => {
  it('counts a relative specifier as internal', () => {
    expect(isInternal('./preview', 'js', new Set())).toBe(true)
    expect(isInternal('../api/types', 'js', new Set())).toBe(true)
  })

  it('counts a bare package as external', () => {
    expect(isInternal('react', 'js', new Set())).toBe(false)
    expect(isInternal('d3-hierarchy', 'js', new Set())).toBe(false)
  })

  it('counts a namespace the repository declares as internal', () => {
    const files = [
      file('api/PrMap.Api/Auth/SessionCookie.cs', '+namespace PrMap.Api.Auth;'),
      file('api/PrMap.Api/Program.cs', '+using PrMap.Api.Auth;', '+using Octokit;'),
    ]

    const changes = parseImports(files)

    expect(changes.find((c) => c.specifier === 'PrMap.Api.Auth')?.internal).toBe(true)
    expect(changes.find((c) => c.specifier === 'Octokit')?.internal).toBe(false)
  })
})

describe('parseImports, other files', () => {
  it('skips a language it cannot read', () => {
    expect(specifiers([file('README.md', '+import this into your heart')])).toEqual([])
  })

  it('has nothing to say about a file with no patch', () => {
    const binary: ChangedFile = {
      filename: 'docs/logo.png',
      status: 'added',
      additions: 0,
      deletions: 0,
      patch: null,
      previousFilename: null,
      changes: 0,
      hasPatch: false,
    }

    expect(parseImports([binary])).toEqual([])
  })
})
