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
import {
  editorReducer,
  createInitialState,
  createStateFromProject,
} from '@/lib/editor/reducer'
import {
  downloadProjectJSON,
  downloadFrameSVG,
  downloadSVG,
  parseProjectJSON,
} from '@/lib/editor/export'
import type { Project } from '@/lib/editor/types'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import ThemeToggle from '@/components/ThemeToggle'
import BetterAuthHeader from '#/integrations/better-auth/header-user'

interface LoaderEditorProps {
  initialGridSize?: number
  initialFrameCount?: number
  initialFrameRate?: number
  initialProject?: Project
  projects?: Array<{ id: string; name: string }>
  currentProjectId?: string
  onProjectSelect?: (projectId: string) => void
  onProjectChange?: (project: Project) => void
  saveStatus?: 'idle' | 'saving' | 'saved' | 'error'
  currentProjectName?: string
  onAddProject?: (name: string) => void | Promise<void>
  onDeleteProject?: () => void | Promise<void>
}

export function LoaderEditor({
  initialGridSize = 7,
  initialFrameCount = 8,
  initialFrameRate = 12,
  initialProject,
  projects,
  currentProjectId,
  onProjectSelect,
  onProjectChange,
  saveStatus,
  currentProjectName,
  onAddProject,
  onDeleteProject,
}: LoaderEditorProps) {
  const [canvasSize, setCanvasSize] = useState(400)
  const [isErase, setIsErase] = useState(false)
  const [canvasBg, setCanvasBg] = useState<'white' | 'transparent'>('white')
  const importInputRef = useRef<HTMLInputElement>(null)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [isProjectActionLoading, setIsProjectActionLoading] = useState(false)
  const currentFrameRef = useRef(0)

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
      initialProject
        ? createStateFromProject(initialProject)
        : createInitialState(args.gridSize, args.frameCount, args.frameRate),
  )

  const { project, editor, history, future } = state

  useEffect(() => {
    if (!initialProject) return
    dispatch({ type: 'LOAD_PROJECT', project: initialProject })
    setIsErase(false)
  }, [initialProject])

  useEffect(() => {
    if (!onProjectChange) return
    onProjectChange(project)
  }, [onProjectChange, project])

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
            colors.add(cell.color)
          }
        }
      }
    }
    return Array.from(colors)
  }, [project.frames])

  useEffect(() => {
    currentFrameRef.current = editor.currentFrame
  }, [editor.currentFrame])

  useEffect(() => {
    if (!editor.isPlaying) return

    const interval = setInterval(() => {
      dispatch({
        type: 'SET_CURRENT_FRAME',
        frame: (currentFrameRef.current + 1) % project.frames.length,
      })
    }, 1000 / project.frameRate)

    return () => clearInterval(interval)
  }, [editor.isPlaying, project.frames.length, project.frameRate])

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
      } else if (e.key === 'f' || e.key === 'F') {
        dispatch({ type: 'SET_TOOL', tool: 'fill' })
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
      if (
        editor.tool === 'select' ||
        editor.tool === 'picker' ||
        editor.tool === 'fill'
      )
        return
      dispatch({
        type: 'PAINT_CELL',
        row,
        col,
        color:
          editor.tool === 'eraser' || isErase
            ? 'transparent'
            : editor.selectedColor,
        shape: editor.brushShape,
        brushSize: editor.brushSize,
      })
    },
    [
      isErase,
      editor.selectedColor,
      editor.brushSize,
      editor.tool,
      editor.brushShape,
    ],
  )

  const handleFill = useCallback(
    (row: number, col: number) => {
      dispatch({
        type: 'FILL_CELL',
        row,
        col,
        color:
          isErase || editor.tool === 'eraser'
            ? 'transparent'
            : editor.selectedColor,
      })
    },
    [isErase, editor.selectedColor, editor.tool],
  )

  const handlePick = useCallback(
    (row: number, col: number) => {
      const cell = currentFrame.grid.cells[row][col]
      if (cell === 'transparent') {
        dispatch({ type: 'SET_TOOL', tool: 'eraser' })
        setIsErase(true)
      } else {
        dispatch({ type: 'SET_COLOR', color: cell.color })
        dispatch({ type: 'SET_BRUSH_SHAPE', shape: cell.shape })
        dispatch({ type: 'SET_TOOL', tool: 'brush' })
        setIsErase(false)
      }
    },
    [currentFrame.grid.cells],
  )

  const handleExport = () => {
    downloadSVG(project)
  }

  const handleExportCurrentFrame = () => {
    downloadFrameSVG(
      currentFrame,
      `loader-frame-${editor.currentFrame + 1}.svg`,
      project.gapSize,
    )
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

  const handleGridSizeChange = (event: ChangeEvent<HTMLSelectElement>) => {
    dispatch({
      type: 'SET_GRID_SIZE',
      gridSize: Number(event.target.value),
    })
  }

  const handleGapSizeChange = (event: ChangeEvent<HTMLInputElement>) => {
    dispatch({
      type: 'SET_GAP_SIZE',
      gapSize: Math.max(0, Math.min(8, Number(event.target.value))),
    })
  }

  const handleFrameRateChange = (event: ChangeEvent<HTMLInputElement>) => {
    dispatch({
      type: 'SET_FRAME_RATE',
      rate: Math.max(1, Math.min(60, Number(event.target.value))),
    })
  }

  const handleProjectSelect = (projectId: string) => {
    onProjectSelect?.(projectId)
  }

  const openAddDialog = () => {
    setIsAddDialogOpen(true)
  }

  const openDeleteDialog = () => {
    setIsDeleteDialogOpen(true)
  }

  const handleBeginPaintSession = useCallback(() => {
    dispatch({ type: 'BEGIN_PAINT_SESSION' })
  }, [])

  const handleEndPaintSession = useCallback(() => {
    dispatch({ type: 'END_PAINT_SESSION' })
  }, [])

  const handleMoveSelection = useCallback(
    (
      fromRow: number,
      fromCol: number,
      toRow: number,
      toCol: number,
      deltaRow: number,
      deltaCol: number,
    ) => {
      dispatch({
        type: 'MOVE_SELECTION',
        fromRow,
        fromCol,
        toRow,
        toCol,
        deltaRow,
        deltaCol,
      })
    },
    [],
  )

  const handleFrameSelect = useCallback((frame: number) => {
    dispatch({ type: 'SET_CURRENT_FRAME', frame })
  }, [])

  const handleFrameAdd = useCallback((index?: number) => {
    if (index == null) return
    dispatch({ type: 'ADD_FRAME', index })
  }, [])

  const handleFrameDelete = useCallback((frame: number) => {
    dispatch({ type: 'DELETE_FRAME', frame })
  }, [])

  const handleToolChange = useCallback(
    (tool: 'brush' | 'eraser' | 'select' | 'picker' | 'fill') => {
      dispatch({ type: 'SET_TOOL', tool })
      if (tool === 'brush') setIsErase(false)
      if (tool === 'eraser') setIsErase(true)
      if (tool === 'fill') setIsErase(false)
    },
    [],
  )

  const handleBrushSizeChange = useCallback((size: 1 | 3) => {
    dispatch({ type: 'SET_BRUSH_SIZE', size })
  }, [])

  const handleBrushShapeChange = useCallback((shape: 'square' | 'circle') => {
    dispatch({ type: 'SET_BRUSH_SHAPE', shape })
  }, [])

  const handleColorChange = useCallback((color: string) => {
    dispatch({ type: 'SET_COLOR', color })
  }, [])

  const handleCloneFrame = useCallback(
    (source: number) => {
      dispatch({
        type: 'CLONE_FRAME',
        source,
        target: editor.currentFrame,
        merge: false,
      })
    },
    [editor.currentFrame],
  )

  const handleClearFrame = useCallback(() => {
    dispatch({ type: 'CLEAR_FRAME', frame: editor.currentFrame })
  }, [editor.currentFrame])

  const handleTogglePlaying = useCallback(() => {
    dispatch({ type: 'TOGGLE_PLAYING' })
  }, [])

  const handleUndo = useCallback(() => {
    dispatch({ type: 'UNDO' })
  }, [])

  const handleRedo = useCallback(() => {
    dispatch({ type: 'REDO' })
  }, [])

  const handleCanvasBgToggle = () => {
    setCanvasBg((prev) => (prev === 'white' ? 'transparent' : 'white'))
  }

  const handleAddDialogChange = (open: boolean) => {
    setIsAddDialogOpen(open)
  }

  const handleDeleteDialogChange = (open: boolean) => {
    setIsDeleteDialogOpen(open)
  }

  const handleNewProjectNameChange = (event: ChangeEvent<HTMLInputElement>) => {
    setNewProjectName(event.target.value)
  }

  const handleAddProjectCancel = () => {
    setIsAddDialogOpen(false)
    setNewProjectName('')
  }

  const handleDeleteProjectCancel = () => {
    setIsDeleteDialogOpen(false)
  }

  const handleAddProjectConfirm = () => {
    if (!onAddProject) return
    const name = newProjectName.trim()
    if (!name) return
    setIsProjectActionLoading(true)
    void Promise.resolve(onAddProject(name)).finally(() => {
      setIsProjectActionLoading(false)
      setIsAddDialogOpen(false)
      setNewProjectName('')
    })
  }

  const handleDeleteProjectConfirm = () => {
    if (!onDeleteProject) return
    setIsProjectActionLoading(true)
    void Promise.resolve(onDeleteProject()).finally(() => {
      setIsProjectActionLoading(false)
      setIsDeleteDialogOpen(false)
    })
  }

  return (
    <>
      <div className="min-h-screen flex flex-col">
        <div className="border-b bg-card">
          <div className="container flex items-center justify-between gap-6 py-4 mx-auto">
            <div className="min-w-0">
              {currentProjectName ? (
                <h1 className="text-md font-semibold truncate">
                  {currentProjectName}
                </h1>
              ) : (
                <h1 className="text-sm font-semibold">Untitled Project</h1>
              )}
            </div>
            {saveStatus && (
              <span className="text-xs text-muted-foreground text-left inline-block min-w-10">
                {saveStatus === 'saving' && 'Saving...'}
                {saveStatus === 'saved' && 'Saved'}
                {saveStatus === 'error' && 'Save failed'}
              </span>
            )}
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
                  onChange={handleGridSizeChange}
                  className="px-2 py-1 border bg-background"
                >
                  <option value={5}>5x5</option>
                  <option value={7}>7x7</option>
                  <option value={8}>8x8</option>
                  <option value={11}>11x11</option>
                  <option value={15}>15x15</option>
                  <option value={16}>16x16</option>
                </select>
              </label>
              <label className="flex items-center gap-2">
                Gap:
                <input
                  type="number"
                  value={project.gapSize}
                  onChange={handleGapSizeChange}
                  className="w-14 px-2 py-1 border bg-background"
                  min={0}
                  max={8}
                />
              </label>
              <label className="flex items-center gap-2">
                Frames: {project.frames.length}
              </label>
              <label className="flex items-center gap-2">
                FPS:
                <input
                  type="number"
                  value={project.frameRate}
                  onChange={handleFrameRateChange}
                  className="w-16 px-2 py-1 border bg-background"
                  min={1}
                  max={60}
                />
              </label>
              <Button
                variant="outline"
                onClick={handleCanvasBgToggle}
                title="Toggle canvas background"
              >
                {canvasBg === 'white' ? 'BG: White' : 'BG: Transparent'}
              </Button>
              <Button role="button" onClick={handleExport}>
                Export SVG
              </Button>
              {projects && projects.length > 0 && onProjectSelect && (
                <DropdownMenu>
                  <DropdownMenuTrigger render={<Button variant="outline" />}>
                    Projects
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {projects.map((entry) => (
                      <DropdownMenuItem
                        key={entry.id}
                        onClick={() => handleProjectSelect(entry.id)}
                        disabled={entry.id === currentProjectId}
                      >
                        {entry.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger render={<Button variant="outline" />}>
                  More
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {onAddProject && (
                    <DropdownMenuItem onClick={openAddDialog}>
                      New Project
                    </DropdownMenuItem>
                  )}
                  {onDeleteProject && (
                    <DropdownMenuItem
                      onClick={openDeleteDialog}
                      disabled={!projects || projects.length <= 1}
                    >
                      Delete Project
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={handleExportCurrentFrame}>
                    Export Current Frame SVG
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
              <div className="w-px h-6 bg-border" />

              <BetterAuthHeader />
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
            gapSize={project.gapSize}
            canvasBg={canvasBg}
            onCellPaint={handlePaint}
            onCellFill={handleFill}
            onCellPick={handlePick}
            onPaintSessionStart={handleBeginPaintSession}
            onPaintSessionEnd={handleEndPaintSession}
            onMoveSelection={handleMoveSelection}
            canvasSize={canvasSize}
          />

          <FrameTimeline
            frames={project.frames}
            currentFrame={editor.currentFrame}
            onFrameSelect={handleFrameSelect}
            onFrameAdd={handleFrameAdd}
            onFrameDelete={handleFrameDelete}
          />

          <BrushToolbar
            tool={editor.tool}
            brushSize={editor.brushSize}
            brushShape={editor.brushShape}
            selectedColor={editor.selectedColor}
            isPlaying={editor.isPlaying}
            frameCount={project.frames.length}
            currentFrame={editor.currentFrame}
            usedColors={usedColors}
            canUndo={canUndo}
            canRedo={canRedo}
            onToolChange={handleToolChange}
            onBrushSizeChange={handleBrushSizeChange}
            onBrushShapeChange={handleBrushShapeChange}
            onColorChange={handleColorChange}
            onIsEraseChange={setIsErase}
            onCloneFrame={handleCloneFrame}
            onClearFrame={handleClearFrame}
            onTogglePlaying={handleTogglePlaying}
            onUndo={handleUndo}
            onRedo={handleRedo}
          />
        </main>
      </div>

      <Dialog open={isAddDialogOpen} onOpenChange={handleAddDialogChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create project</DialogTitle>
            <DialogDescription>
              Enter a name for your new project.
            </DialogDescription>
          </DialogHeader>
          <input
            value={newProjectName}
            onChange={handleNewProjectNameChange}
            placeholder="My loader"
            className="flex h-9 w-full border border-input bg-background px-3 py-1 text-sm shadow-xs"
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleAddProjectCancel}
              disabled={isProjectActionLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddProjectConfirm}
              disabled={isProjectActionLoading || !newProjectName.trim()}
            >
              {isProjectActionLoading ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteDialogOpen} onOpenChange={handleDeleteDialogChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete project</DialogTitle>
            <DialogDescription>
              This will permanently delete this project. This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleDeleteProjectCancel}
              disabled={isProjectActionLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteProjectConfirm}
              disabled={isProjectActionLoading}
            >
              {isProjectActionLoading ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
