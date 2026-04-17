import { useState, useCallback, useRef, useEffect } from 'react'
import { getBrushCells, type Grid } from '@/lib/editor/types'

interface GridCanvasProps {
  grid: Grid
  brushSize: 1 | 3
  isErase: boolean
  onCellPaint: (row: number, col: number) => void
  canvasSize?: number
}

// Get all cells between two points (Bresenham's line algorithm)
function getCellsBetween(
  from: [number, number],
  to: [number, number],
): [number, number][] {
  const [r1, c1] = from
  const [r2, c2] = to
  const cells: [number, number][] = []

  const dr = Math.abs(r2 - r1)
  const dc = Math.abs(c2 - c1)
  const sr = r1 < r2 ? 1 : -1
  const sc = c1 < c2 ? 1 : -1
  let err = dr - dc

  let r = r1
  let c = c1

  while (true) {
    cells.push([r, c])
    if (r === r2 && c === c2) break
    const e2 = 2 * err
    if (e2 > -dc) {
      err -= dc
      r += sr
    }
    if (e2 < dr) {
      err += dr
      c += sc
    }
  }

  return cells
}

export function GridCanvas({
  grid,
  brushSize,
  isErase,
  onCellPaint,
  canvasSize = 400,
}: GridCanvasProps) {
  const cellSize = canvasSize / grid.size
  const gridLineColor = '#e5e7eb'
  const [hoverCell, setHoverCell] = useState<[number, number] | null>(null)
  const [isMouseDown, setIsMouseDown] = useState(false)
  const lastCellRef = useRef<[number, number] | null>(null)

  // Listen for mouseup on window to catch releases outside canvas
  useEffect(() => {
    const handleWindowMouseUp = () => {
      setIsMouseDown(false)
      lastCellRef.current = null
    }
    window.addEventListener('mouseup', handleWindowMouseUp)
    return () => window.removeEventListener('mouseup', handleWindowMouseUp)
  }, [])

  const hoverCells = hoverCell
    ? getBrushCells(hoverCell[0], hoverCell[1], brushSize, grid.size)
    : []

  const paintCell = useCallback(
    (row: number, col: number) => {
      onCellPaint(row, col)
    },
    [onCellPaint],
  )

  const handlePaintAt = useCallback(
    (cell: [number, number]) => {
      // Only call onCellPaint once per cell - reducer handles brush expansion
      paintCell(cell[0], cell[1])
    },
    [paintCell],
  )

  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    e.preventDefault()
    const cell = getCellFromEvent(e)
    if (cell) {
      setIsMouseDown(true)
      lastCellRef.current = cell
      handlePaintAt(cell)
    }
  }

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const cell = getCellFromEvent(e)
    setHoverCell(cell)

    if (isMouseDown && cell && lastCellRef.current) {
      // Get all cells between last position and current position
      const cellsBetween = getCellsBetween(lastCellRef.current, cell)
      cellsBetween.forEach((c) => handlePaintAt(c))
      lastCellRef.current = cell
    } else if (isMouseDown && cell && !lastCellRef.current) {
      // Edge case: mouse is down but no last cell (shouldn't happen normally)
      lastCellRef.current = cell
      handlePaintAt(cell)
    }
  }

  const handleMouseUp = () => {
    setIsMouseDown(false)
    lastCellRef.current = null
  }

  // Don't clear isMouseDown on leave - let it persist until mouseup
  const handleMouseLeave = () => {
    setHoverCell(null)
  }

  const getCellFromEvent = (
    e: React.MouseEvent<SVGSVGElement>,
  ): [number, number] | null => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const col = Math.floor(x / cellSize)
    const row = Math.floor(y / cellSize)
    if (row >= 0 && row < grid.size && col >= 0 && col < grid.size) {
      return [row, col]
    }
    return null
  }

  return (
    <svg
      width={canvasSize}
      height={canvasSize}
      viewBox={`0 0 ${canvasSize} ${canvasSize}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      className="block cursor-crosshair border border-border bg-background select-none"
    >
      {/* Background for transparent cells */}
      <rect x={0} y={0} width={canvasSize} height={canvasSize} fill="#ffffff" />
      {grid.cells.map((row, r) =>
        row.map((cell, c) => {
          const x = c * cellSize
          const y = r * cellSize
          return (
            <rect
              key={`${r}-${c}`}
              x={x}
              y={y}
              width={cellSize}
              height={cellSize}
              fill={cell}
              stroke={gridLineColor}
              strokeWidth={0.5}
            />
          )
        }),
      )}
      {/* Hover preview overlay */}
      {hoverCells.map(([r, c]) => {
        const x = c * cellSize
        const y = r * cellSize
        return (
          <rect
            key={`preview-${r}-${c}`}
            x={x}
            y={y}
            width={cellSize}
            height={cellSize}
            fill="transparent"
            stroke={isErase ? '#666666' : '#374151'}
            strokeWidth={1}
            strokeDasharray="2"
            pointerEvents="none"
          />
        )
      })}
    </svg>
  )
}
