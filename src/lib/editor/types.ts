export type CellColor = string | 'transparent'

export interface Grid {
  size: number
  cells: CellColor[][]
}

export interface Frame {
  grid: Grid
}

export interface Project {
  gridSize: number
  frameCount: number
  frameRate: number
  frames: Frame[]
}

export interface EditorState {
  currentFrame: number
  brushSize: 1 | 3
  selectedColor: string
  isPlaying: boolean
  tool: 'brush' | 'eraser' | 'select' | 'picker' | 'fill'
}

export interface HistoryState {
  project: Project
}

export function createEmptyGrid(size: number): Grid {
  const cells: CellColor[][] = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => 'transparent'),
  )
  return { size, cells }
}

export function createEmptyFrame(size: number): Frame {
  return { grid: createEmptyGrid(size) }
}

export function createProject(
  gridSize: number,
  frameCount: number,
  frameRate: number,
): Project {
  return {
    gridSize,
    frameCount,
    frameRate,
    frames: Array.from({ length: frameCount }, () =>
      createEmptyFrame(gridSize),
    ),
  }
}

export function cloneGrid(grid: Grid): Grid {
  return {
    size: grid.size,
    cells: grid.cells.map((row) => [...row]),
  }
}

export function cloneFrame(frame: Frame): Frame {
  return { grid: cloneGrid(frame.grid) }
}

export function getBrushCells(
  row: number,
  col: number,
  brushSize: 1 | 3,
  gridSize: number,
): [number, number][] {
  if (brushSize === 1) {
    return row >= 0 && row < gridSize && col >= 0 && col < gridSize
      ? [[row, col]]
      : []
  }

  const cells: [number, number][] = []
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      const r = row + dr
      const c = col + dc
      if (r >= 0 && r < gridSize && c >= 0 && c < gridSize) {
        cells.push([r, c])
      }
    }
  }
  return cells
}
