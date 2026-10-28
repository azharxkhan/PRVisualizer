import { hierarchy, treemap, treemapSquarify } from 'd3-hierarchy'
import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { ChangedFile } from '../api/types'
import { groupByFolder, type TreeNode } from './groupByFolder'
import { statusColour } from './statusColour'

/** A file with no changed lines still gets a box, or it would vanish from the map. */
const MIN_AREA = 1

/** Below this a cell has no room for a label without overflowing its own box. */
const LABEL_MIN_WIDTH = 46
const LABEL_MIN_HEIGHT = 18
const FOLDER_LABEL_HEIGHT = 16

type Props = {
  files: ChangedFile[]
  onSelect?: (file: ChangedFile) => void
}

export function Treemap({ files, onSelect }: Props) {
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

  const cells = useMemo(() => {
    if (size.width < 1 || size.height < 1) return null

    const root = hierarchy<TreeNode>(groupByFolder(files), (node) =>
      node.kind === 'folder' ? node.children : undefined,
    )
      .sum((node) => (node.kind === 'file' ? Math.max(node.file.changes, MIN_AREA) : 0))
      .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))

    return treemap<TreeNode>()
      .tile(treemapSquarify)
      .size([size.width, size.height])
      .paddingOuter(2)
      // Room for the folder's own label above its children.
      .paddingTop((node) => (node.depth > 0 && node.children ? FOLDER_LABEL_HEIGHT : 2))
      .paddingInner(1)
      .round(true)(root)
  }, [files, size.height, size.width])

  return (
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
                      <text className="folder-label" x={5} y={12} clipPath="none">
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
                  className="file"
                  tabIndex={0}
                  role="button"
                  aria-label={label}
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
                    rx={2}
                    fill={statusColour(file.status)}
                    fillOpacity={0.85}
                  />
                  {width > LABEL_MIN_WIDTH && height > LABEL_MIN_HEIGHT && (
                    <text className="file-label" x={4} y={13}>
                      {data.name}
                    </text>
                  )}
                </g>
              )
            })}
        </svg>
      )}
    </div>
  )
}
