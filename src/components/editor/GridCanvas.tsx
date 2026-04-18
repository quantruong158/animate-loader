import { useState, useCallback, useRef, useEffect } from 'react'
import { getBrushCells } from '@/lib/editor/types'
import type { Grid } from '@/lib/editor/types'

type ToolMode = 'brush' | 'eraser' | 'select' | 'picker'

interface SelectionRect {
  from: [number, number]
  to: [number, number]
}

interface SelectedCell {
  row: number
  col: number
}

interface GridCanvasProps {
  grid: Grid
  brushSize: 1 | 3
  isErase: boolean
  isPlaying: boolean
  tool: ToolMode
  onCellPaint: (row: number, col: number) => void
  onCellPick: (row: number, col: number) => void
  onPaintSessionStart: () => void
  onPaintSessionEnd: () => void
  onMoveSelection: (
    fromRow: number,
    fromCol: number,
    toRow: number,
    toCol: number,
    deltaRow: number,
    deltaCol: number,
  ) => void
  canvasSize?: number
}

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

function normalizeRect(rect: SelectionRect) {
  return {
    minRow: Math.min(rect.from[0], rect.to[0]),
    maxRow: Math.max(rect.from[0], rect.to[0]),
    minCol: Math.min(rect.from[1], rect.to[1]),
    maxCol: Math.max(rect.from[1], rect.to[1]),
  }
}

function trimSelectionToPaintedCells(
  rect: SelectionRect,
  cells: Grid['cells'],
): SelectionRect | null {
  const normalized = normalizeRect(rect)
  let minPaintedRow = Number.POSITIVE_INFINITY
  let maxPaintedRow = Number.NEGATIVE_INFINITY
  let minPaintedCol = Number.POSITIVE_INFINITY
  let maxPaintedCol = Number.NEGATIVE_INFINITY

  for (let r = normalized.minRow; r <= normalized.maxRow; r++) {
    for (let c = normalized.minCol; c <= normalized.maxCol; c++) {
      if (cells[r][c] === 'transparent') continue
      minPaintedRow = Math.min(minPaintedRow, r)
      maxPaintedRow = Math.max(maxPaintedRow, r)
      minPaintedCol = Math.min(minPaintedCol, c)
      maxPaintedCol = Math.max(maxPaintedCol, c)
    }
  }

  if (!Number.isFinite(minPaintedRow)) return null

  return {
    from: [minPaintedRow, minPaintedCol],
    to: [maxPaintedRow, maxPaintedCol],
  }
}

export function GridCanvas({
  grid,
  brushSize,
  isErase,
  isPlaying,
  tool,
  onCellPaint,
  onCellPick,
  onPaintSessionStart,
  onPaintSessionEnd,
  onMoveSelection,
  canvasSize = 400,
}: GridCanvasProps) {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const cellSize = canvasSize / grid.size
  const gridLineColor = '#e5e7eb'
  const [hoverCell, setHoverCell] = useState<[number, number] | null>(null)
  const [isMouseDown, setIsMouseDown] = useState(false)
  const [selectionRect, setSelectionRect] = useState<SelectionRect | null>(null)
  const [selectedCells, setSelectedCells] = useState<SelectedCell[]>([])
  const [isSelecting, setIsSelecting] = useState(false)
  const [isDraggingSelection, setIsDraggingSelection] = useState(false)
  const [dragDelta, setDragDelta] = useState<[number, number]>([0, 0])
  const lastCellRef = useRef<[number, number] | null>(null)
  const isMouseDownRef = useRef(false)
  const selectionAnchorRef = useRef<[number, number] | null>(null)
  const dragAnchorRef = useRef<[number, number] | null>(null)
  const selectionRectRef = useRef<SelectionRect | null>(null)
  const dragDeltaRef = useRef<[number, number]>([0, 0])
  const isSelectingRef = useRef(false)
  const isDraggingSelectionRef = useRef(false)
  const selectedCellsRef = useRef<SelectedCell[]>([])

  const clearSelection = useCallback(() => {
    setSelectionRect(null)
    setSelectedCells([])
    setIsSelecting(false)
    setIsDraggingSelection(false)
    setDragDelta([0, 0])
    selectionAnchorRef.current = null
    dragAnchorRef.current = null
  }, [])

  useEffect(() => {
    selectionRectRef.current = selectionRect
  }, [selectionRect])

  useEffect(() => {
    dragDeltaRef.current = dragDelta
  }, [dragDelta])

  useEffect(() => {
    isMouseDownRef.current = isMouseDown
  }, [isMouseDown])

  useEffect(() => {
    isSelectingRef.current = isSelecting
  }, [isSelecting])

  useEffect(() => {
    isDraggingSelectionRef.current = isDraggingSelection
  }, [isDraggingSelection])

  useEffect(() => {
    selectedCellsRef.current = selectedCells
  }, [selectedCells])

  useEffect(() => {
    if (tool !== 'select') {
      clearSelection()
    }
  }, [tool, clearSelection])

  useEffect(() => {
    if (isPlaying) {
      clearSelection()
      setHoverCell(null)
      setIsMouseDown(false)
      lastCellRef.current = null
    }
  }, [isPlaying, clearSelection])

  useEffect(() => {
    clearSelection()
  }, [grid, clearSelection])

  useEffect(() => {
    const handleDocumentMouseDown = (event: MouseEvent) => {
      if (!selectionRectRef.current) return
      const svg = svgRef.current
      if (!svg) return
      const target = event.target
      if (target instanceof Node && !svg.contains(target)) {
        clearSelection()
      }
    }

    document.addEventListener('mousedown', handleDocumentMouseDown)
    return () =>
      document.removeEventListener('mousedown', handleDocumentMouseDown)
  }, [clearSelection])

  const clampCell = useCallback(
    (cell: [number, number]): [number, number] => [
      Math.max(0, Math.min(grid.size - 1, cell[0])),
      Math.max(0, Math.min(grid.size - 1, cell[1])),
    ],
    [grid.size],
  )

  const finalizeSelectionDrag = useCallback(() => {
    if (!isDraggingSelectionRef.current) return

    const rect = selectionRectRef.current
    const selected = selectedCellsRef.current
    const [deltaRow, deltaCol] = dragDeltaRef.current

    if (rect && selected.length > 0 && (deltaRow !== 0 || deltaCol !== 0)) {
      onMoveSelection(
        rect.from[0],
        rect.from[1],
        rect.to[0],
        rect.to[1],
        deltaRow,
        deltaCol,
      )

      const movedCells = selected
        .map((cell) => ({
          row: cell.row + deltaRow,
          col: cell.col + deltaCol,
        }))
        .filter(
          (cell) =>
            cell.row >= 0 &&
            cell.row < grid.size &&
            cell.col >= 0 &&
            cell.col < grid.size,
        )

      setSelectedCells(movedCells)
      if (movedCells.length > 0) {
        let minRow = Number.POSITIVE_INFINITY
        let maxRow = Number.NEGATIVE_INFINITY
        let minCol = Number.POSITIVE_INFINITY
        let maxCol = Number.NEGATIVE_INFINITY
        for (const cell of movedCells) {
          minRow = Math.min(minRow, cell.row)
          maxRow = Math.max(maxRow, cell.row)
          minCol = Math.min(minCol, cell.col)
          maxCol = Math.max(maxCol, cell.col)
        }
        setSelectionRect({
          from: clampCell([minRow, minCol]),
          to: clampCell([maxRow, maxCol]),
        })
      } else {
        setSelectionRect(null)
      }
    }

    setIsDraggingSelection(false)
    setDragDelta([0, 0])
    dragAnchorRef.current = null
  }, [clampCell, grid.size, onMoveSelection])

  const finalizeMarqueeSelection = useCallback(() => {
    if (!isSelectingRef.current) return
    isSelectingRef.current = false
    setIsSelecting(false)
    selectionAnchorRef.current = null

    const rect = selectionRectRef.current
    if (!rect) {
      setSelectionRect(null)
      setSelectedCells([])
      return
    }

    const trimmed = trimSelectionToPaintedCells(rect, grid.cells)
    if (!trimmed) {
      setSelectionRect(null)
      setSelectedCells([])
      return
    }

    const normalized = normalizeRect(trimmed)
    const cells: SelectedCell[] = []
    for (let r = normalized.minRow; r <= normalized.maxRow; r++) {
      for (let c = normalized.minCol; c <= normalized.maxCol; c++) {
        if (grid.cells[r][c] === 'transparent') continue
        cells.push({ row: r, col: c })
      }
    }

    setSelectionRect(trimmed)
    setSelectedCells(cells)
  }, [grid.cells])

  useEffect(() => {
    const handleWindowMouseUp = () => {
      if (isMouseDownRef.current) {
        onPaintSessionEnd()
      }
      if (tool === 'select') {
        finalizeMarqueeSelection()
        finalizeSelectionDrag()
      }
      setIsMouseDown(false)
      lastCellRef.current = null
    }
    window.addEventListener('mouseup', handleWindowMouseUp)
    return () => window.removeEventListener('mouseup', handleWindowMouseUp)
  }, [finalizeMarqueeSelection, finalizeSelectionDrag, onPaintSessionEnd, tool])

  const hoverCells =
    isPlaying || tool === 'select' || tool === 'picker' || !hoverCell
      ? []
      : getBrushCells(hoverCell[0], hoverCell[1], brushSize, grid.size)

  const paintCell = useCallback(
    (row: number, col: number) => {
      onCellPaint(row, col)
    },
    [onCellPaint],
  )

  const handlePaintAt = useCallback(
    (cell: [number, number]) => {
      paintCell(cell[0], cell[1])
    },
    [paintCell],
  )

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

  const isCellSelected = (cell: [number, number]) =>
    selectedCells.some(
      (selected) => selected.row === cell[0] && selected.col === cell[1],
    )

  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    e.preventDefault()
    if (isPlaying) return
    const cell = getCellFromEvent(e)

    if (tool === 'picker') {
      if (cell) {
        onCellPick(cell[0], cell[1])
      }
      return
    }

    if (tool === 'select') {
      if (!cell) return

      if (selectedCells.length > 0 && isCellSelected(cell)) {
        setIsDraggingSelection(true)
        dragAnchorRef.current = cell
        setDragDelta([0, 0])
        return
      }

      setIsSelecting(true)
      selectionAnchorRef.current = cell
      setSelectionRect({ from: cell, to: cell })
      setIsDraggingSelection(false)
      setDragDelta([0, 0])
      return
    }

    if (cell) {
      onPaintSessionStart()
      setIsMouseDown(true)
      lastCellRef.current = cell
      handlePaintAt(cell)
    }
  }

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (isPlaying) {
      setHoverCell(null)
      return
    }
    const cell = getCellFromEvent(e)
    setHoverCell(cell)

    if (tool === 'select') {
      if (isSelecting && cell && selectionAnchorRef.current) {
        setSelectionRect({ from: selectionAnchorRef.current, to: cell })
      } else if (isDraggingSelection && cell && dragAnchorRef.current) {
        setDragDelta([
          cell[0] - dragAnchorRef.current[0],
          cell[1] - dragAnchorRef.current[1],
        ])
      }
      return
    }

    if (isMouseDown && cell && lastCellRef.current) {
      const cellsBetween = getCellsBetween(lastCellRef.current, cell)
      cellsBetween.forEach((c) => handlePaintAt(c))
      lastCellRef.current = cell
    } else if (isMouseDown && cell && !lastCellRef.current) {
      lastCellRef.current = cell
      handlePaintAt(cell)
    }
  }

  const handleMouseUp = () => {
    if (isPlaying) return
    if (tool === 'select') {
      if (isSelecting) finalizeMarqueeSelection()
      finalizeSelectionDrag()
      return
    }

    setIsMouseDown(false)
    lastCellRef.current = null
    onPaintSessionEnd()
  }

  const handleMouseLeave = () => {
    setHoverCell(null)
  }

  const normalizedSelection = selectionRect
    ? normalizeRect(selectionRect)
    : null

  const movingPreviewCells = isDraggingSelection
    ? selectedCells
        .map((cell) => ({
          sourceRow: cell.row,
          sourceCol: cell.col,
          color: grid.cells[cell.row][cell.col],
          targetRow: cell.row + dragDelta[0],
          targetCol: cell.col + dragDelta[1],
        }))
        .filter(
          (cell) =>
            cell.color !== 'transparent' &&
            cell.targetRow >= 0 &&
            cell.targetRow < grid.size &&
            cell.targetCol >= 0 &&
            cell.targetCol < grid.size,
        )
    : []

  const cursorClass = isPlaying
    ? 'cursor-default'
    : tool === 'select'
      ? isDraggingSelection
        ? 'cursor-move'
        : 'cursor-default'
      : 'cursor-crosshair'

  return (
    <svg
      ref={svgRef}
      width={canvasSize}
      height={canvasSize}
      viewBox={`0 0 ${canvasSize} ${canvasSize}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      className={`block border border-border bg-background select-none ${cursorClass}`}
    >
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

      {isSelecting && normalizedSelection && (
        <rect
          x={normalizedSelection.minCol * cellSize}
          y={normalizedSelection.minRow * cellSize}
          width={
            (normalizedSelection.maxCol - normalizedSelection.minCol + 1) *
            cellSize
          }
          height={
            (normalizedSelection.maxRow - normalizedSelection.minRow + 1) *
            cellSize
          }
          fill="transparent"
          stroke="#2563eb"
          strokeWidth={1.5}
          strokeDasharray="4 2"
          pointerEvents="none"
        />
      )}

      {selectedCells.map((cell) => (
        <rect
          key={`selected-cell-${cell.row}-${cell.col}`}
          x={cell.col * cellSize}
          y={cell.row * cellSize}
          width={cellSize}
          height={cellSize}
          fill="transparent"
          stroke="#2563eb"
          strokeWidth={1.5}
          strokeDasharray="4 2"
          pointerEvents="none"
        />
      ))}

      {movingPreviewCells.map((cell) => (
        <rect
          key={`move-preview-${cell.sourceRow}-${cell.sourceCol}`}
          x={cell.targetCol * cellSize}
          y={cell.targetRow * cellSize}
          width={cellSize}
          height={cellSize}
          fill={cell.color}
          opacity={0.65}
          pointerEvents="none"
        />
      ))}
    </svg>
  )
}
