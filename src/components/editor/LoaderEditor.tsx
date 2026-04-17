import { useEffect, useReducer, useCallback, useMemo, useState } from 'react'
import { GridCanvas } from './GridCanvas'
import { FrameTimeline } from './FrameTimeline'
import { BrushToolbar } from './BrushToolbar'
import { editorReducer, createInitialState } from '@/lib/editor/reducer'
import { downloadSVG } from '@/lib/editor/export'
import { Button } from '@/components/ui/button'
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
        setIsErase(false)
      } else if (e.key === 'e' || e.key === 'E') {
        setIsErase(true)
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
      dispatch({
        type: 'PAINT_CELL',
        row,
        col,
        color: isErase ? 'transparent' : editor.selectedColor,
        brushSize: editor.brushSize,
      })
    },
    [isErase, editor.selectedColor, editor.brushSize],
  )

  const handleExport = () => {
    downloadSVG(project)
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="border-b bg-card">
        <div className="container flex items-center gap-6 py-4 justify-end mx-auto">
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
            <Button onClick={handleExport} size="sm">
              Export SVG
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </div>

      <main className="flex-1 flex flex-col items-center justify-center p-6 gap-6">
        <GridCanvas
          grid={currentFrame.grid}
          brushSize={editor.brushSize}
          isErase={isErase}
          onCellPaint={handlePaint}
          canvasSize={canvasSize}
        />

        <FrameTimeline
          frames={project.frames}
          currentFrame={editor.currentFrame}
          onFrameSelect={(frame) =>
            dispatch({ type: 'SET_CURRENT_FRAME', frame })
          }
          onFrameAdd={() => dispatch({ type: 'ADD_FRAME' })}
          onFrameDelete={(frame) => dispatch({ type: 'DELETE_FRAME', frame })}
        />

        <BrushToolbar
          brushSize={editor.brushSize}
          selectedColor={editor.selectedColor}
          isErase={isErase}
          isPlaying={editor.isPlaying}
          frameCount={project.frames.length}
          currentFrame={editor.currentFrame}
          usedColors={usedColors}
          canUndo={canUndo}
          canRedo={canRedo}
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
