import { hierarchy, treemap, treemapSquarify, type HierarchyRectangularNode } from 'd3-hierarchy'
import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { ChangedFile } from '../api/types'
import { areaFor } from './area'
import { groupByFolder, type TreeNode } from './groupByFolder'
import { statusColour } from './statusColour'

/** Below this a cell has no room for a label without overflowing its own box. */
const LABEL_MIN_WIDTH = 56
const LABEL_MIN_HEIGHT = 22
/** A second line of counts only fits once the cell is this tall. */
const COUNT_MIN_HEIGHT = 40
const FOLDER_LABEL_HEIGHT = 18

/**
 * Narrower or shorter than this and a cell is a sliver: a one-line change next to a 600-line
 * rewrite lands as a 4px ribbon that is unreadable and all but unclickable. An area floor alone
 * cannot fix this, because squarify can spend that area on a tall thin strip. Those files leave
 * the map and get listed under it instead, where they can be read and clicked.
 */
const MIN_HIT = 20

/** One re-layout is usually enough; the cap stops a pathological pull request looping. */
const MAX_PASSES = 3

type Size = { width: number; height: number }

function layoutOf(files: ChangedFile[], size: Size) {
  const totalChanges = files.reduce((sum, file) => sum + file.changes, 0)

  const root = hierarchy<TreeNode>(groupByFolder(files), (node) =>
    node.kind === 'folder' ? node.children : undefined,
  )
    .sum((node) =>
      node.kind === 'file'
        ? areaFor(node.file.changes, totalChanges, size.width * size.height)
        : 0,
    )
    .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))

  return treemap<TreeNode>()
    .tile(treemapSquarify)
    .size([size.width, size.height])
    .paddingOuter(2)
    // Room for the folder's own label above its children.
    .paddingTop((node) => (node.depth > 0 && node.children ? FOLDER_LABEL_HEIGHT : 2))
    .paddingInner(1)
    .round(true)(root)
}

function sliversIn(root: HierarchyRectangularNode<TreeNode>): ChangedFile[] {
  return root
    .descendants()
    .filter((node) => node.data.kind === 'file')
    .filter((node) => node.x1 - node.x0 < MIN_HIT || node.y1 - node.y0 < MIN_HIT)
    .map((node) => (node.data.kind === 'file' ? node.data.file : null))
    .filter((file): file is ChangedFile => file !== null)
}

type Props = {
  files: ChangedFile[]
  /** The file whose diff is open, outlined so the map says which one it is. */
  selected?: ChangedFile | null
  onSelect?: (file: ChangedFile) => void
}

export function Treemap({ files, selected, onSelect }: Props) {
  const wrapper = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })

  useLayoutEffect(() => {
    const element = wrapper.current
    if (!element) return

    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      setSize({ width, height })
    })

    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const { cells, slivers } = useMemo(() => {
    if (size.width < 1 || size.height < 1) {
      return { cells: null, slivers: [] as ChangedFile[] }
    }

    let drawn = files
    let root = layoutOf(drawn, size)
    const removed: ChangedFile[] = []

    for (let pass = 0; pass < MAX_PASSES; pass++) {
      const small = sliversIn(root)
      if (small.length === 0) break

      const remaining = drawn.filter((file) => !small.includes(file))
      // If everything is a sliver the map has nothing left to say, so keep the last good one.
      if (remaining.length === 0) break

      removed.push(...small)
      drawn = remaining
      root = layoutOf(drawn, size)
    }

    return { cells: root, slivers: removed }
  }, [files, size])

  return (
    <div className="treemap-wrap">
      <div className="treemap" ref={wrapper}>
        {cells && (
          <svg width={size.width} height={size.height} role="group" aria-label="Changed files">
            {cells
              .descendants()
              .filter((node) => node.depth > 0)
              .map((node, index) => {
                const width = node.x1 - node.x0
                const height = node.y1 - node.y0
                const data = node.data

                if (data.kind === 'folder') {
                  const room = width > LABEL_MIN_WIDTH && height > FOLDER_LABEL_HEIGHT * 2
                  return (
                    <g key={`folder-${index}`} transform={`translate(${node.x0},${node.y0})`}>
                      <rect className="folder" width={width} height={height} rx={3} />
                      {room && (
                        <text className="folder-label" x={7} y={13} clipPath="none">
                          {data.name}
                        </text>
                      )}
                    </g>
                  )
                }

                const file = data.file
                const label = `${file.filename}, ${file.status}, +${file.additions} −${file.deletions}`

                return (
                  <g
                    key={file.filename}
                    transform={`translate(${node.x0},${node.y0})`}
                    className={file.filename === selected?.filename ? 'file selected' : 'file'}
                    tabIndex={0}
                    role="button"
                    aria-label={label}
                    aria-pressed={file.filename === selected?.filename}
                    onClick={() => onSelect?.(file)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        onSelect?.(file)
                      }
                    }}
                  >
                    <title>{label}</title>
                    <rect
                      width={width}
                      height={height}
                      rx={4}
                      fill={statusColour(file.status)}
                      fillOpacity={0.9}
                    />
                    {width > LABEL_MIN_WIDTH && height > LABEL_MIN_HEIGHT && (
                      <text className="file-label" x={6} y={16}>
                        {data.name}
                      </text>
                    )}
                    {width > LABEL_MIN_WIDTH && height > COUNT_MIN_HEIGHT && (
                      <text className="file-count" x={6} y={31}>
                        +{file.additions} −{file.deletions}
                      </text>
                    )}
                  </g>
                )
              })}
          </svg>
        )}
      </div>

      {slivers.length > 0 && (
        <div className="slivers">
          <p className="slivers-why">
            {slivers.length} {slivers.length === 1 ? 'file is' : 'files are'} too small to draw at
            this size:
          </p>
          <ul>
            {slivers.map((file) => (
              <li key={file.filename}>
                <button
                  type="button"
                  className={file.filename === selected?.filename ? 'current' : undefined}
                  onClick={() => onSelect?.(file)}
                  aria-pressed={file.filename === selected?.filename}
                  title={`${file.filename}, +${file.additions} −${file.deletions}`}
                >
                  <span className="dot" style={{ background: statusColour(file.status) }} />
                  {file.filename.slice(file.filename.lastIndexOf('/') + 1)}
                  <span className="nums">
                    +{file.additions} −{file.deletions}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
