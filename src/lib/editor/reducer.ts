import type { Project, EditorState, HistoryState, Cell, CellShape } from './types'
import { cloneFrame, createProject, getBrushCells, migrateCell } from './types'

export interface EditorAction {
  type:
    | 'PAINT_CELL'
    | 'FILL_CELL'
    | 'SET_BRUSH_SIZE'
    | 'SET_TOOL'
    | 'SET_COLOR'
    | 'SET_BRUSH_SHAPE'
    | 'SET_CURRENT_FRAME'
    | 'ADD_FRAME'
    | 'DELETE_FRAME'
    | 'SET_GRID_SIZE'
    | 'SET_FRAME_RATE'
    | 'SET_GAP_SIZE'
    | 'LOAD_PROJECT'
    | 'CLONE_FRAME'
    | 'CLEAR_FRAME'
    | 'TOGGLE_PLAYING'
    | 'MOVE_SELECTION'
    | 'BEGIN_PAINT_SESSION'
    | 'END_PAINT_SESSION'
    | 'UNDO'
    | 'REDO'
  row?: number
  col?: number
  color?: string
  shape?: CellShape
  size?: 1 | 3
  tool?: 'brush' | 'eraser' | 'select' | 'picker' | 'fill'
  brushSize?: 1 | 3
  gridSize?: number
  frame?: number
  index?: number
  project?: Project
  source?: number
  target?: number
  merge?: boolean
  rate?: number
  count?: number
  fromRow?: number
  fromCol?: number
  toRow?: number
  toCol?: number
  deltaRow?: number
  deltaCol?: number
  gapSize?: number
}

function paintCell(
  frames: { grid: { size: number; cells: Cell[][] } }[],
  currentFrame: number,
  row: number,
  col: number,
  cell: Cell,
  brushSize: 1 | 3,
) {
  const newFrames = frames.map((f, i) => {
    if (i !== currentFrame) return f
    return {
      grid: {
        size: f.grid.size,
        cells: f.grid.cells.map((r) => [...r]),
      },
    }
  })

  let changed = false
  const gridSize = newFrames[currentFrame].grid.size
  const cells = getBrushCells(row, col, brushSize, gridSize)
  for (const [r, c] of cells) {
    const existing = newFrames[currentFrame].grid.cells[r][c]
    if (cell === 'transparent') {
      if (existing !== 'transparent') {
        changed = true
        newFrames[currentFrame].grid.cells[r][c] = 'transparent'
      }
    } else {
      if (
        existing === 'transparent' ||
        existing.color !== cell.color ||
        existing.shape !== cell.shape
      ) {
        changed = true
        newFrames[currentFrame].grid.cells[r][c] = cell
      }
    }
  }

  return { frames: newFrames, changed }
}

function fillCell(
  frames: { grid: { size: number; cells: Cell[][] } }[],
  currentFrame: number,
  row: number,
  col: number,
  color: string,
) {
  const newFrames = frames.map((f, i) => {
    if (i !== currentFrame) return f
    return {
      grid: {
        size: f.grid.size,
        cells: f.grid.cells.map((r) => [...r]),
      },
    }
  })

  const frame = newFrames[currentFrame]
  const gridSize = frame.grid.size
  if (row < 0 || row >= gridSize || col < 0 || col >= gridSize) {
    return { frames: newFrames, changed: false }
  }

  const targetCell = frame.grid.cells[row][col]
  const targetColor = targetCell === 'transparent' ? 'transparent' : targetCell.color
  if (targetColor === color) {
    return { frames: newFrames, changed: false }
  }

  const queue: [number, number][] = [[row, col]]
  const seen = new Set<string>([`${row},${col}`])
  let changed = false

  while (queue.length > 0) {
    const [r, c] = queue.shift()!
    const current = frame.grid.cells[r][c]
    const currentColor = current === 'transparent' ? 'transparent' : current.color
    if (currentColor !== targetColor) continue

    if (color === 'transparent') {
      frame.grid.cells[r][c] = 'transparent'
    } else if (current === 'transparent') {
      frame.grid.cells[r][c] = { color, shape: 'square' }
    } else {
      frame.grid.cells[r][c] = { ...current, color }
    }
    changed = true

    const neighbors: [number, number][] = [
      [r - 1, c],
      [r + 1, c],
      [r, c - 1],
      [r, c + 1],
    ]

    for (const [nr, nc] of neighbors) {
      if (nr < 0 || nr >= gridSize || nc < 0 || nc >= gridSize) continue
      const key = `${nr},${nc}`
      if (seen.has(key)) continue
      seen.add(key)
      queue.push([nr, nc])
    }
  }

  return { frames: newFrames, changed }
}

function moveSelection(
  frames: { grid: { size: number; cells: Cell[][] } }[],
  currentFrame: number,
  fromRow: number,
  fromCol: number,
  toRow: number,
  toCol: number,
  deltaRow: number,
  deltaCol: number,
) {
  const newFrames = frames.map((f, i) => {
    if (i !== currentFrame) return f
    return {
      grid: {
        size: f.grid.size,
        cells: f.grid.cells.map((r) => [...r]),
      },
    }
  })

  const frame = newFrames[currentFrame]
  const minRow = Math.max(0, Math.min(fromRow, toRow))
  const maxRow = Math.min(frame.grid.size - 1, Math.max(fromRow, toRow))
  const minCol = Math.max(0, Math.min(fromCol, toCol))
  const maxCol = Math.min(frame.grid.size - 1, Math.max(fromCol, toCol))

  const snapshot: { row: number; col: number; cell: Cell }[] = []
  for (let r = minRow; r <= maxRow; r++) {
    for (let c = minCol; c <= maxCol; c++) {
      const cell = frame.grid.cells[r][c]
      if (cell === 'transparent') continue
      snapshot.push({ row: r, col: c, cell })
    }
  }

  for (const entry of snapshot) {
    frame.grid.cells[entry.row][entry.col] = 'transparent'
  }

  for (const entry of snapshot) {
    const targetRow = entry.row + deltaRow
    const targetCol = entry.col + deltaCol
    if (
      targetRow >= 0 &&
      targetRow < frame.grid.size &&
      targetCol >= 0 &&
      targetCol < frame.grid.size
    ) {
      frame.grid.cells[targetRow][targetCol] = entry.cell
    }
  }

  return newFrames
}

export interface EditorReducerState {
  project: Project
  editor: EditorState
  history: HistoryState[]
  future: HistoryState[]
  paintSessionStart: HistoryState | null
  paintSessionDirty: boolean
}

export function editorReducer(
  state: EditorReducerState,
  action: EditorAction,
): EditorReducerState {
  const {
    project,
    editor,
    history,
    future,
    paintSessionStart,
    paintSessionDirty,
  } = state
  const current: HistoryState = { project }

  switch (action.type) {
    case 'PAINT_CELL': {
      const { row, col, color, shape, brushSize } = action
      if (row == null || col == null || color == null || brushSize == null || shape == null)
        return state
      const cell: Cell = color === 'transparent' ? 'transparent' : { color, shape }
      const { frames: newFrames, changed } = paintCell(
        project.frames,
        editor.currentFrame,
        row,
        col,
        cell,
        brushSize,
      )
      if (!changed) return state

      const newProject = { ...project, frames: newFrames }

      if (paintSessionStart) {
        if (paintSessionDirty) {
          return {
            project: newProject,
            editor,
            history,
            future: [],
            paintSessionStart,
            paintSessionDirty,
          }
        }

        return {
          project: newProject,
          editor,
          history: [...history, paintSessionStart],
          future: [],
          paintSessionStart,
          paintSessionDirty: true,
        }
      }

      return {
        project: newProject,
        editor,
        history: [...history, current],
        future: [],
        paintSessionStart: null,
        paintSessionDirty: false,
      }
    }
    case 'FILL_CELL': {
      const { row, col, color } = action
      if (row == null || col == null || color == null) return state

      const { frames: newFrames, changed } = fillCell(
        project.frames,
        editor.currentFrame,
        row,
        col,
        color,
      )
      if (!changed) return state

      const newProject = { ...project, frames: newFrames }
      return {
        project: newProject,
        editor,
        history: [...history, current],
        future: [],
        paintSessionStart: null,
        paintSessionDirty: false,
      }
    }
    case 'BEGIN_PAINT_SESSION': {
      if (paintSessionStart) return state
      return {
        project,
        editor,
        history,
        future,
        paintSessionStart: current,
        paintSessionDirty: false,
      }
    }
    case 'END_PAINT_SESSION': {
      if (!paintSessionStart && !paintSessionDirty) return state
      return {
        project,
        editor,
        history,
        future,
        paintSessionStart: null,
        paintSessionDirty: false,
      }
    }
    case 'SET_BRUSH_SIZE': {
      if (action.size == null) return state
      const newEditor = { ...editor, brushSize: action.size }
      return {
        project,
        editor: newEditor,
        history: [...history, current],
        future: [],
        paintSessionStart: null,
        paintSessionDirty: false,
      }
    }
    case 'SET_TOOL': {
      if (action.tool == null || editor.tool === action.tool) return state
      const newEditor = { ...editor, tool: action.tool }
      return {
        project,
        editor: newEditor,
        history,
        future,
        paintSessionStart: null,
        paintSessionDirty: false,
      }
    }
    case 'SET_COLOR': {
      if (action.color == null) return state
      if (editor.selectedColor === action.color) return state
      const newEditor = { ...editor, selectedColor: action.color }
      return {
        project,
        editor: newEditor,
        history,
        future,
        paintSessionStart: null,
        paintSessionDirty: false,
      }
    }
    case 'SET_BRUSH_SHAPE': {
      if (action.shape == null) return state
      if (editor.brushShape === action.shape) return state
      const newEditor = { ...editor, brushShape: action.shape }
      return {
        project,
        editor: newEditor,
        history,
        future,
        paintSessionStart: null,
        paintSessionDirty: false,
      }
    }
    case 'SET_CURRENT_FRAME': {
      if (action.frame == null) return state
      const newEditor = { ...editor, currentFrame: action.frame }
      if (editor.isPlaying) {
        return {
          project,
          editor: newEditor,
          history,
          future,
          paintSessionStart: null,
          paintSessionDirty: false,
        }
      }
      return {
        project,
        editor: newEditor,
        history: [...history, current],
        future: [],
        paintSessionStart: null,
        paintSessionDirty: false,
      }
    }
    case 'ADD_FRAME': {
      if (project.frames.length >= 64) return state
      const blankFrame = {
        grid: {
          size: project.gridSize,
          cells: Array.from({ length: project.gridSize }, () =>
            Array(project.gridSize).fill('transparent'),
          ),
        },
      }
      const insertIndex = action.index ?? project.frames.length
      const newFrames = [
        ...project.frames.slice(0, insertIndex),
        blankFrame,
        ...project.frames.slice(insertIndex),
      ]
      const newProject = {
        ...project,
        frames: newFrames,
        frameCount: newFrames.length,
      }
      const newEditor = { ...editor, currentFrame: insertIndex }
      return {
        project: newProject,
        editor: newEditor,
        history: [...history, current],
        future: [],
        paintSessionStart: null,
        paintSessionDirty: false,
      }
    }
    case 'DELETE_FRAME': {
      if (project.frames.length <= 1 || action.frame == null) return state
      const newFrames = project.frames.filter((_, i) => i !== action.frame)
      const newCurrentFrame = Math.min(
        editor.currentFrame - (action.frame < editor.currentFrame ? 1 : 0),
        newFrames.length - 1,
      )
      const newProject = {
        ...project,
        frames: newFrames,
        frameCount: newFrames.length,
      }
      const newEditor = { ...editor, currentFrame: newCurrentFrame }
      return {
        project: newProject,
        editor: newEditor,
        history: [...history, current],
        future: [],
        paintSessionStart: null,
        paintSessionDirty: false,
      }
    }
    case 'SET_GRID_SIZE': {
      if (action.gridSize == null) return state
      const newProject = createProject(
        action.gridSize,
        project.frameCount,
        project.frameRate,
        project.gapSize,
      )
      const newEditor = { ...editor, currentFrame: 0 }
      return {
        project: newProject,
        editor: newEditor,
        history: [...history, current],
        future: [],
        paintSessionStart: null,
        paintSessionDirty: false,
      }
    }
    case 'SET_FRAME_RATE': {
      if (action.rate == null) return state
      const newProject = { ...project, frameRate: action.rate }
      return {
        project: newProject,
        editor,
        history: [...history, current],
        future: [],
        paintSessionStart: null,
        paintSessionDirty: false,
      }
    }
    case 'SET_GAP_SIZE': {
      if (action.gapSize == null) return state
      const newProject = { ...project, gapSize: action.gapSize }
      return {
        project: newProject,
        editor,
        history: [...history, current],
        future: [],
        paintSessionStart: null,
        paintSessionDirty: false,
      }
    }
    case 'LOAD_PROJECT': {
      if (action.project == null) return state
      const loaded = action.project
      const migratedFrames = loaded.frames.map((frame) => ({
        grid: {
          size: frame.grid.size,
          cells: frame.grid.cells.map((row) =>
            row.map((cell) => migrateCell(cell)),
          ),
        },
      }))
      const migratedProject: Project = {
        ...loaded,
        gapSize: loaded.gapSize ?? 0,
        frames: migratedFrames,
      }
      return {
        project: migratedProject,
        editor: {
          currentFrame: 0,
          brushSize: 1,
          selectedColor: '#1e293b',
          isPlaying: false,
          tool: 'brush',
          brushShape: 'square',
        },
        history: [],
        future: [],
        paintSessionStart: null,
        paintSessionDirty: false,
      }
    }
    case 'CLONE_FRAME': {
      if (
        action.source == null ||
        action.target == null ||
        action.merge == null
      )
        return state
      const source = action.source
      const target = action.target
      const newFrames = project.frames.map((f, i) => {
        if (i !== target) return f
        if (action.merge) {
          const targetFrame = cloneFrame(f)
          const sourceFrame = project.frames[source]
          for (let r = 0; r < targetFrame.grid.size; r++) {
            for (let c = 0; c < targetFrame.grid.size; c++) {
              const sourceCell = sourceFrame.grid.cells[r][c]
              if (sourceCell !== 'transparent') {
                targetFrame.grid.cells[r][c] = sourceCell
              }
            }
          }
          return targetFrame
        }
        return cloneFrame(project.frames[source])
      })
      const newProject = { ...project, frames: newFrames }
      return {
        project: newProject,
        editor,
        history: [...history, current],
        future: [],
        paintSessionStart: null,
        paintSessionDirty: false,
      }
    }
    case 'CLEAR_FRAME': {
      if (action.frame == null) return state
      const newFrames = project.frames.map((f, i) => {
        if (i !== action.frame) return f
        return {
          grid: {
            size: f.grid.size,
            cells: Array.from({ length: f.grid.size }, () =>
              Array(f.grid.size).fill('transparent'),
            ),
          },
        }
      })
      const newProject = { ...project, frames: newFrames }
      return {
        project: newProject,
        editor,
        history: [...history, current],
        future: [],
        paintSessionStart: null,
        paintSessionDirty: false,
      }
    }
    case 'TOGGLE_PLAYING':
      return {
        project,
        editor: { ...editor, isPlaying: !editor.isPlaying },
        history,
        future,
        paintSessionStart: null,
        paintSessionDirty: false,
      }
    case 'MOVE_SELECTION': {
      const { fromRow, fromCol, toRow, toCol, deltaRow, deltaCol } = action
      if (
        fromRow == null ||
        fromCol == null ||
        toRow == null ||
        toCol == null ||
        deltaRow == null ||
        deltaCol == null
      ) {
        return state
      }
      if (deltaRow === 0 && deltaCol === 0) return state

      const newFrames = moveSelection(
        project.frames,
        editor.currentFrame,
        fromRow,
        fromCol,
        toRow,
        toCol,
        deltaRow,
        deltaCol,
      )
      const newProject = { ...project, frames: newFrames }
      return {
        project: newProject,
        editor,
        history: [...history, current],
        future: [],
        paintSessionStart: null,
        paintSessionDirty: false,
      }
    }
    case 'UNDO': {
      if (history.length === 0) return state
      const previous = history[history.length - 1]
      return {
        project: previous.project,
        editor,
        history: history.slice(0, -1),
        future: [current, ...future],
        paintSessionStart: null,
        paintSessionDirty: false,
      }
    }
    case 'REDO': {
      if (future.length === 0) return state
      const next = future[0]
      return {
        project: next.project,
        editor,
        history: [...history, current],
        future: future.slice(1),
        paintSessionStart: null,
        paintSessionDirty: false,
      }
    }
    default:
      return state
  }
}

export function createInitialState(
  gridSize: number,
  frameCount: number,
  frameRate: number,
): EditorReducerState {
  const project = createProject(gridSize, frameCount, frameRate)
  const editor: EditorState = {
    currentFrame: 0,
    brushSize: 1,
    selectedColor: '#1e293b',
    isPlaying: false,
    tool: 'brush',
    brushShape: 'square',
  }
  return {
    project,
    editor,
    history: [],
    future: [],
    paintSessionStart: null,
    paintSessionDirty: false,
  }
}

export function createStateFromProject(project: Project): EditorReducerState {
  return {
    project,
    editor: {
      currentFrame: 0,
      brushSize: 1,
      selectedColor: '#1e293b',
      isPlaying: false,
      tool: 'brush',
      brushShape: 'square',
    },
    history: [],
    future: [],
    paintSessionStart: null,
    paintSessionDirty: false,
  }
}
