import { memo, useRef, useEffect, useCallback } from 'react'
import type { Frame, Cell } from '@/lib/editor/types'
import { Button } from '@/components/ui/button'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'

interface FrameThumbnailProps {
  frame: Frame
  index: number
  isSelected: boolean
  isLast: boolean
  thumbnailSize: number
  onSelect: (index: number) => void
  onDelete: (index: number) => void
  onAdd: (index: number) => void
  canDelete: boolean
  canInsert: boolean
}

const FrameThumbnail = memo(function FrameThumbnailComponent({
  frame,
  index,
  isSelected,
  isLast,
  thumbnailSize,
  onSelect,
  onDelete,
  onAdd,
  canDelete,
  canInsert,
}: FrameThumbnailProps) {
  const cellSize = thumbnailSize / frame.grid.size

  const cellFill = (cell: Cell): string =>
    cell === 'transparent' ? 'transparent' : cell.color

  const cellShape = (cell: Cell): 'square' | 'circle' =>
    cell === 'transparent' ? 'square' : cell.shape

  return (
    <div className="relative">
      <div
        className={`relative group cursor-pointer rounded border-2 transition-colors ${
          isSelected
            ? 'border-primary'
            : 'border-transparent hover:border-muted'
        }`}
        onClick={() => onSelect(index)}
        onContextMenu={(e) => {
          e.preventDefault()
          if (canDelete) {
            onDelete(index)
          }
        }}
      >
        <svg
          width={thumbnailSize}
          height={thumbnailSize}
          viewBox={`0 0 ${thumbnailSize} ${thumbnailSize}`}
          className="block border"
        >
          {frame.grid.cells.map((row, r) =>
            row.map((cell, c) => {
              const x = c * cellSize
              const y = r * cellSize
              if (cell === 'transparent') {
                return (
                  <rect
                    key={`${r}-${c}`}
                    x={x}
                    y={y}
                    width={cellSize}
                    height={cellSize}
                    fill="transparent"
                  />
                )
              }
              if (cellShape(cell) === 'circle') {
                return (
                  <circle
                    key={`${r}-${c}`}
                    cx={x + cellSize / 2}
                    cy={y + cellSize / 2}
                    r={cellSize / 2}
                    fill={cellFill(cell)}
                  />
                )
              }
              return (
                <rect
                  key={`${r}-${c}`}
                  x={x}
                  y={y}
                  width={cellSize}
                  height={cellSize}
                  fill={cellFill(cell)}
                />
              )
            }),
          )}
        </svg>
        <div className="absolute -bottom-1 -right-1 bg-background text-xs px-1 rounded text-muted-foreground font-mono">
          {index + 1}
        </div>
      </div>
      {!isLast && canInsert && (
        <div className="absolute inset-y-0 left-full w-2 group/insert">
          <Button
            size="xs"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation()
              onAdd(index + 1)
            }}
            className="border-dashed absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover/insert:opacity-90 transition-opacity z-10"
            title={`Insert frame at position ${index + 1}`}
          >
            +
          </Button>
        </div>
      )}
    </div>
  )
})

interface FrameTimelineProps {
  frames: Frame[]
  currentFrame: number
  onFrameSelect: (frame: number) => void
  onFrameAdd: (index?: number) => void
  onFrameDelete: (frame: number) => void
}

export function FrameTimeline({
  frames,
  currentFrame,
  onFrameSelect,
  onFrameAdd,
  onFrameDelete,
}: FrameTimelineProps) {
  const thumbnailSize = 48

  const callbacksRef = useRef({ onFrameSelect, onFrameAdd, onFrameDelete })
  useEffect(() => {
    callbacksRef.current = { onFrameSelect, onFrameAdd, onFrameDelete }
  })

  const handleSelect = useCallback((index: number) => {
    callbacksRef.current.onFrameSelect(index)
  }, [])

  const handleAdd = useCallback((index?: number) => {
    callbacksRef.current.onFrameAdd(index)
  }, [])

  const handleDelete = useCallback((index: number) => {
    callbacksRef.current.onFrameDelete(index)
  }, [])

  return (
    <ScrollArea className="group/timeline max-w-full">
      <div className="flex items-center gap-2 p-3 bg-card border overflow-x-auto max-w-full">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleAdd(0)}
          className="shrink-0 w-14 h-14 p-0 border-dashed"
          title="Add frame"
        >
          <span className="text-2xl leading-none">+</span>
        </Button>
        <div className="flex items-center gap-2">
          {frames.map((frame, index) => (
            <FrameThumbnail
              key={index}
              frame={frame}
              index={index}
              isSelected={index === currentFrame}
              isLast={index === frames.length - 1}
              thumbnailSize={thumbnailSize}
              onSelect={handleSelect}
              onDelete={handleDelete}
              onAdd={handleAdd}
              canDelete={frames.length > 1}
              canInsert={frames.length < 64}
            />
          ))}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleAdd(frames.length)}
          className="shrink-0 w-14 h-14 p-0 border-dashed"
          title="Add frame"
        >
          <span className="text-2xl">+</span>
        </Button>
      </div>
      <ScrollBar
        className="group-hover/timeline:opacity-100 opacity-0"
        orientation="horizontal"
      />
    </ScrollArea>
  )
}
