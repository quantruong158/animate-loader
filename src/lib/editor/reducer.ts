import type { Project, EditorState, HistoryState, CellColor } from './types'
import { cloneFrame, createProject, getBrushCells } from './types'

export interface EditorAction {
  type:
    | 'PAINT_CELL'
    | 'SET_BRUSH_SIZE'
    | 'SET_COLOR'
    | 'SET_CURRENT_FRAME'
    | 'ADD_FRAME'
    | 'DELETE_FRAME'
    | 'SET_GRID_SIZE'
    | 'SET_FRAME_RATE'
    | 'LOAD_PROJECT'
    | 'CLONE_FRAME'
    | 'CLEAR_FRAME'
    | 'TOGGLE_PLAYING'
    | 'UNDO'
    | 'REDO'
  row?: number
  col?: number
  color?: CellColor
  size?: 1 | 3
  brushSize?: 1 | 3
  gridSize?: number
  frame?: number
  project?: Project
  source?: number
  target?: number
  merge?: boolean
  rate?: number
  count?: number
}

function paintCell(
  frames: { grid: { size: number; cells: CellColor[][] } }[],
  currentFrame: number,
  row: number,
  col: number,
  color: CellColor,
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

  const gridSize = newFrames[currentFrame].grid.size
  const cells = getBrushCells(row, col, brushSize, gridSize)
  for (const [r, c] of cells) {
    newFrames[currentFrame].grid.cells[r][c] = color
  }

  return newFrames
}

export interface EditorReducerState {
  project: Project
  editor: EditorState
  history: HistoryState[]
  future: HistoryState[]
}

export function editorReducer(
  state: EditorReducerState,
  action: EditorAction,
): EditorReducerState {
  const { project, editor, history, future } = state
  const current: HistoryState = { project, editor }

  switch (action.type) {
    case 'PAINT_CELL': {
      const { row, col, color, brushSize } = action
      if (row == null || col == null || color == null || brushSize == null)
        return state
      const newFrames = paintCell(
        project.frames,
        editor.currentFrame,
        row,
        col,
        color,
        brushSize,
      )
      const newProject = { ...project, frames: newFrames }
      return {
        project: newProject,
        editor,
        history: [...history, current],
        future: [],
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
      }
    }
    case 'SET_CURRENT_FRAME': {
      if (action.frame == null) return state
      const newEditor = { ...editor, currentFrame: action.frame }
      // Don't add to history for frame changes during playback - just state update
      if (editor.isPlaying) {
        return { project, editor: newEditor, history, future }
      }
      return {
        project,
        editor: newEditor,
        history: [...history, current],
        future: [],
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
      }
    }
    case 'SET_GRID_SIZE': {
      if (action.gridSize == null) return state
      const newProject = createProject(
        action.gridSize,
        project.frameCount,
        project.frameRate,
      )
      const newEditor = { ...editor, currentFrame: 0 }
      return {
        project: newProject,
        editor: newEditor,
        history: [...history, current],
        future: [],
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
      }
    }
    case 'LOAD_PROJECT': {
      if (action.project == null) return state
      return {
        project: action.project,
        editor: {
          currentFrame: 0,
          brushSize: 1,
          selectedColor: '#1e293b',
          isPlaying: false,
        },
        history: [],
        future: [],
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
              if (sourceFrame.grid.cells[r][c] !== 'transparent') {
                targetFrame.grid.cells[r][c] = sourceFrame.grid.cells[r][c]
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
      }
    }
    case 'TOGGLE_PLAYING':
      return {
        project,
        editor: { ...editor, isPlaying: !editor.isPlaying },
        history,
        future,
      }
    case 'UNDO': {
      if (history.length === 0) return state
      const previous = history[history.length - 1]
      return {
        project: previous.project,
        editor: previous.editor,
        history: history.slice(0, -1),
        future: [current, ...future],
      }
    }
    case 'REDO': {
      if (future.length === 0) return state
      const next = future[0]
      return {
        project: next.project,
        editor: next.editor,
        history: [...history, current],
        future: future.slice(1),
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
  }
  return {
    project,
    editor,
    history: [],
    future: [],
  }
}
