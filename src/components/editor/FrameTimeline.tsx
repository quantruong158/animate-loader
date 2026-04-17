import type { Frame } from '@/lib/editor/types'
import { Button } from '@/components/ui/button'

interface FrameTimelineProps {
  frames: Frame[]
  currentFrame: number
  onFrameSelect: (frame: number) => void
  onFrameAdd: () => void
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

  const renderThumbnail = (frame: Frame, index: number) => {
    const cellSize = thumbnailSize / frame.grid.size
    const isSelected = index === currentFrame

    return (
      <div
        key={index}
        className={`relative group cursor-pointer rounded border-2 transition-colors ${
          isSelected
            ? 'border-primary'
            : 'border-transparent hover:border-muted'
        }`}
        onClick={() => onFrameSelect(index)}
        onContextMenu={(e) => {
          e.preventDefault()
          if (frames.length > 1) {
            onFrameDelete(index)
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
            row.map((cell, c) => (
              <rect
                key={`${r}-${c}`}
                x={c * cellSize}
                y={r * cellSize}
                width={cellSize}
                height={cellSize}
                fill={cell}
              />
            )),
          )}
        </svg>
        <div className="absolute -bottom-1 -right-1 bg-background text-xs px-1 rounded text-muted-foreground font-mono">
          {index + 1}
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 p-3 bg-card border overflow-x-auto">
      <div className="flex gap-2">
        {frames.map((frame, index) => renderThumbnail(frame, index))}
      </div>
      {frames.length < 64 && (
        <Button
          variant="outline"
          size="sm"
          onClick={onFrameAdd}
          className="shrink-0 w-14 h-14 p-0 border-dashed"
          title="Add frame"
        >
          <span className="text-2xl leading-none">+</span>
        </Button>
      )}
    </div>
  )
}
