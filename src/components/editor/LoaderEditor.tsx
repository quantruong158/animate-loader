import {
  useEffect,
  useReducer,
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { ChangeEvent } from 'react'
import { GridCanvas } from './GridCanvas'
import { FrameTimeline } from './FrameTimeline'
import { BrushToolbar } from './BrushToolbar'
import { editorReducer, createInitialState } from '@/lib/editor/reducer'
import {
  downloadProjectJSON,
  downloadSVG,
  parseProjectJSON,
} from '@/lib/editor/export'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import ThemeToggle from '@/components/ThemeToggle'

interface LoaderEditorProps {
  initialGridSize?: number
  initialFrameCount?: number
  initialFrameRate?: number
}

export function LoaderEditor({
  initialGridSize = 7,
  initialFrameCount = 8,
  initialFrameRate = 12,
}: LoaderEditorProps) {
  const [canvasSize, setCanvasSize] = useState(400)
  const [isErase, setIsErase] = useState(false)
  const importInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setCanvasSize(Math.min(500, window.innerWidth - 48))
  }, [])

  const [state, dispatch] = useReducer(
    editorReducer,
    {
      gridSize: initialGridSize,
      frameCount: initialFrameCount,
      frameRate: initialFrameRate,
    },
    (args) =>
      createInitialState(args.gridSize, args.frameCount, args.frameRate),
  )

  const { project, editor, history, future } = state

  const canUndo = history.length > 0
  const canRedo = future.length > 0

  const currentFrame = useMemo(
    () => project.frames[editor.currentFrame],
    [project.frames, editor.currentFrame],
  )

  // Compute used colors across all frames
  const usedColors = useMemo(() => {
    const colors = new Set<string>()
    for (const frame of project.frames) {
      for (const row of frame.grid.cells) {
        for (const cell of row) {
          if (cell !== 'transparent') {
            colors.add(cell)
          }
        }
      }
    }
    return Array.from(colors)
  }, [project.frames])

  useEffect(() => {
    if (!editor.isPlaying) return

    const interval = setInterval(() => {
      dispatch({
        type: 'SET_CURRENT_FRAME',
        frame: (editor.currentFrame + 1) % project.frames.length,
      })
    }, 1000 / project.frameRate)

    return () => clearInterval(interval)
  }, [
    editor.isPlaying,
    editor.currentFrame,
    project.frames.length,
    project.frameRate,
  ])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement ||
        (e.target instanceof HTMLElement && e.target.isContentEditable)
      ) {
        return
      }

      if (e.key === '[') {
        dispatch({ type: 'SET_BRUSH_SIZE', size: 1 })
      } else if (e.key === ']') {
        dispatch({ type: 'SET_BRUSH_SIZE', size: 3 })
      } else if (e.key === 'b' || e.key === 'B') {
        dispatch({ type: 'SET_TOOL', tool: 'brush' })
        setIsErase(false)
      } else if (e.key === 'e' || e.key === 'E') {
        dispatch({ type: 'SET_TOOL', tool: 'eraser' })
        setIsErase(true)
      } else if (e.key === 'v' || e.key === 'V') {
        dispatch({ type: 'SET_TOOL', tool: 'select' })
      } else if (e.key === 'x' || e.key === 'X') {
        dispatch({ type: 'SET_TOOL', tool: 'picker' })
      } else if (e.key === 'c' || e.key === 'C') {
        if (!editor.isPlaying) {
          dispatch({ type: 'CLEAR_FRAME', frame: editor.currentFrame })
        }
      } else if (e.key === 'p' || e.key === 'P') {
        if (!editor.isPlaying && editor.currentFrame > 0) {
          dispatch({
            type: 'CLONE_FRAME',
            source: editor.currentFrame - 1,
            target: editor.currentFrame,
            merge: false,
          })
        }
      } else if (e.key === ' ' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault()
        dispatch({ type: 'TOGGLE_PLAYING' })
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        dispatch({
          type: 'SET_CURRENT_FRAME',
          frame: Math.max(0, editor.currentFrame - 1),
        })
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        dispatch({
          type: 'SET_CURRENT_FRAME',
          frame: Math.min(project.frames.length - 1, editor.currentFrame + 1),
        })
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        if (canUndo) dispatch({ type: 'UNDO' })
      } else if (
        (e.ctrlKey || e.metaKey) &&
        (e.key === 'y' || (e.key === 'z' && e.shiftKey))
      ) {
        e.preventDefault()
        if (canRedo) dispatch({ type: 'REDO' })
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [
    editor.isPlaying,
    editor.currentFrame,
    project.frames.length,
    canUndo,
    canRedo,
  ])

  const handlePaint = useCallback(
    (row: number, col: number) => {
      if (editor.tool === 'select' || editor.tool === 'picker') return
      dispatch({
        type: 'PAINT_CELL',
        row,
        col,
        color:
          editor.tool === 'eraser' || isErase
            ? 'transparent'
            : editor.selectedColor,
        brushSize: editor.brushSize,
      })
    },
    [isErase, editor.selectedColor, editor.brushSize, editor.tool],
  )

  const handlePick = useCallback(
    (row: number, col: number) => {
      const color = currentFrame.grid.cells[row][col]
      if (color === 'transparent') {
        dispatch({ type: 'SET_TOOL', tool: 'eraser' })
        setIsErase(true)
      } else {
        dispatch({ type: 'SET_COLOR', color })
        dispatch({ type: 'SET_TOOL', tool: 'brush' })
        setIsErase(false)
      }
    },
    [currentFrame.grid.cells],
  )

  const handleExport = () => {
    downloadSVG(project)
  }

  const handleExportJSON = () => {
    downloadProjectJSON(project)
  }

  const handleImportClick = () => {
    importInputRef.current?.click()
  }

  const handleImportChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) return

    try {
      const json = await file.text()
      const importedProject = parseProjectJSON(json)
      dispatch({ type: 'LOAD_PROJECT', project: importedProject })
      setIsErase(false)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to import project JSON'
      window.alert(message)
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="border-b bg-card">
        <div className="container flex items-center gap-6 py-4 justify-end mx-auto">
          <input
            ref={importInputRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={handleImportChange}
          />
          <div className="flex items-center gap-4 text-sm">
            <label className="flex items-center gap-2">
              Grid:
              <select
                value={project.gridSize}
                onChange={(e) =>
                  dispatch({
                    type: 'SET_GRID_SIZE',
                    gridSize: Number(e.target.value),
                  })
                }
                className="px-2 py-1 rounded border bg-background"
              >
                <option value={5}>5x5</option>
                <option value={7}>7x7</option>
                <option value={8}>8x8</option>
                <option value={11}>11x11</option>
                <option value={16}>16x16</option>
              </select>
            </label>
            <label className="flex items-center gap-2">
              Frames: {project.frames.length}
            </label>
            <label className="flex items-center gap-2">
              FPS:
              <input
                type="number"
                value={project.frameRate}
                onChange={(e) =>
                  dispatch({
                    type: 'SET_FRAME_RATE',
                    rate: Math.max(1, Math.min(60, Number(e.target.value))),
                  })
                }
                className="w-16 px-2 py-1 rounded border bg-background"
                min={1}
                max={60}
              />
            </label>
            <Button role="button" onClick={handleExport}>
              Export SVG
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="outline" />}>
                Project
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleExport}>
                  Export SVG
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportJSON}>
                  Export JSON
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleImportClick}>
                  Import JSON
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <ThemeToggle />
          </div>
        </div>
      </div>

      <main className="flex-1 flex flex-col items-center justify-center p-6 gap-6">
        <GridCanvas
          grid={currentFrame.grid}
          brushSize={editor.brushSize}
          isErase={isErase}
          isPlaying={editor.isPlaying}
          tool={editor.tool}
          onCellPaint={handlePaint}
          onCellPick={handlePick}
          onPaintSessionStart={() => dispatch({ type: 'BEGIN_PAINT_SESSION' })}
          onPaintSessionEnd={() => dispatch({ type: 'END_PAINT_SESSION' })}
          onMoveSelection={(
            fromRow,
            fromCol,
            toRow,
            toCol,
            deltaRow,
            deltaCol,
          ) =>
            dispatch({
              type: 'MOVE_SELECTION',
              fromRow,
              fromCol,
              toRow,
              toCol,
              deltaRow,
              deltaCol,
            })
          }
          canvasSize={canvasSize}
        />

        <FrameTimeline
          frames={project.frames}
          currentFrame={editor.currentFrame}
          onFrameSelect={(frame) =>
            dispatch({ type: 'SET_CURRENT_FRAME', frame })
          }
          onFrameAdd={(index) => dispatch({ type: 'ADD_FRAME', index })}
          onFrameDelete={(frame) => dispatch({ type: 'DELETE_FRAME', frame })}
        />

        <BrushToolbar
          tool={editor.tool}
          brushSize={editor.brushSize}
          selectedColor={editor.selectedColor}
          isPlaying={editor.isPlaying}
          frameCount={project.frames.length}
          currentFrame={editor.currentFrame}
          usedColors={usedColors}
          canUndo={canUndo}
          canRedo={canRedo}
          onToolChange={(tool) => {
            dispatch({ type: 'SET_TOOL', tool })
            if (tool === 'brush') setIsErase(false)
            if (tool === 'eraser') setIsErase(true)
          }}
          onBrushSizeChange={(size) =>
            dispatch({ type: 'SET_BRUSH_SIZE', size })
          }
          onColorChange={(color) => dispatch({ type: 'SET_COLOR', color })}
          onIsEraseChange={setIsErase}
          onCloneFrame={(source) =>
            dispatch({
              type: 'CLONE_FRAME',
              source,
              target: editor.currentFrame,
              merge: false,
            })
          }
          onClearFrame={() =>
            dispatch({ type: 'CLEAR_FRAME', frame: editor.currentFrame })
          }
          onTogglePlaying={() => dispatch({ type: 'TOGGLE_PLAYING' })}
          onUndo={() => dispatch({ type: 'UNDO' })}
          onRedo={() => dispatch({ type: 'REDO' })}
        />
      </main>
    </div>
  )
}
