import { describe, expect, it } from 'vitest'
import type { ChangedFile } from '../api/types'
import { ROOT_FOLDER, groupByFolder, heaviestFolder } from './groupByFolder'

function file(filename: string, changes = 2): ChangedFile {
  const additions = changes
  return {
    filename,
    status: 'modified',
    additions,
    deletions: 0,
    patch: '@@ -1 +1 @@',
    previousFilename: null,
    changes,
    hasPatch: true,
  }
}

/** Folder names from the root down to each file, which is what the map draws as regions. */
function paths(node: ReturnType<typeof groupByFolder>, trail: string[] = []): string[] {
  return node.children.flatMap((child) =>
    child.kind === 'folder'
      ? paths(child, [...trail, child.name])
      : [[...trail, child.name].join('/')],
  )
}

describe('groupByFolder', () => {
  it('nests a file under every folder in its path', () => {
    const tree = groupByFolder([file('api/GitHub/Service.cs'), file('web/one.ts')])

    expect(paths(tree)).toEqual(['api/GitHub/Service.cs', 'web/one.ts'])
  })

  it('folds a chain of single-child folders into one label', () => {
    const tree = groupByFolder([file('src/coreclr/tools/aot/One.cs'), file('src/coreclr/Two.cs')])

    // src/coreclr holds two things, so it stays; tools/aot below it is a chain of one.
    expect(tree.children.map((child) => child.name)).toEqual(['src/coreclr'])
    expect(paths(tree)).toEqual(['src/coreclr/tools/aot/One.cs', 'src/coreclr/Two.cs'])
  })

  it('puts two files in one folder under the same node', () => {
    const tree = groupByFolder([file('src/one.ts'), file('src/two.ts')])

    expect(tree.children).toHaveLength(1)
    expect(paths(tree)).toEqual(['src/one.ts', 'src/two.ts'])
  })

  it('groups repository-root files under a single folder', () => {
    const tree = groupByFolder([file('README.md'), file('src/one.ts')])

    expect(paths(tree)).toEqual([`${ROOT_FOLDER}/README.md`, 'src/one.ts'])
  })

  it('returns an empty root for an empty pull request', () => {
    expect(groupByFolder([]).children).toEqual([])
  })

  it('keeps folders in the order GitHub returned them', () => {
    const tree = groupByFolder([file('web/one.ts'), file('api/two.cs'), file('web/three.ts')])

    expect(tree.children.map((child) => child.name)).toEqual(['web', 'api'])
  })
})

describe('heaviestFolder', () => {
  it('sums changed lines per top-level folder', () => {
    // web wins on the sum of two files, not on any single file being the largest.
    const heaviest = heaviestFolder([
      file('web/src/one.ts', 20),
      file('api/two.cs', 30),
      file('web/src/three.ts', 15),
    ])

    expect(heaviest).toEqual({ name: 'web', changes: 35 })
  })

  it('counts a root-level file as its own folder', () => {
    expect(heaviestFolder([file('README.md', 7)])).toEqual({ name: ROOT_FOLDER, changes: 7 })
  })

  it('breaks a tie in favour of the folder GitHub listed first', () => {
    const heaviest = heaviestFolder([file('web/one.ts', 5), file('api/two.cs', 5)])

    expect(heaviest?.name).toBe('web')
  })

  it('has no answer for an empty pull request', () => {
    expect(heaviestFolder([])).toBeNull()
  })
})
