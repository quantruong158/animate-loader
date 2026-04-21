import { useState } from 'react'
import type { CSSProperties } from 'react'
import { RgbaColorPicker } from 'react-colorful'
import type { RgbaColor } from 'react-colorful'
import {
  Brush,
  Eraser,
  PaintBucket,
  Undo2,
  Redo2,
  Copy,
  MousePointer2,
  Pipette,
  Square,
  Circle,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Kbd } from '@/components/ui/kbd'
import { TAILWIND_PALETTE } from '@/lib/editor/colors'

function hexToRgba(color: string): RgbaColor {
  if (color === 'transparent') return { r: 0, g: 0, b: 0, a: 0 }
  const hex = color.replace('#', '')
  if (hex.length === 6) {
    return {
      r: parseInt(hex.slice(0, 2), 16),
      g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16),
      a: 1,
    }
  }
  if (hex.length === 8) {
    return {
      r: parseInt(hex.slice(0, 2), 16),
      g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16),
      a: parseInt(hex.slice(6, 8), 16) / 255,
    }
  }
  return { r: 0, g: 0, b: 0, a: 1 }
}

function rgbaToHex(color: RgbaColor): string {
  if (color.a === 0) return 'transparent'
  const r = Math.round(color.r).toString(16).padStart(2, '0')
  const g = Math.round(color.g).toString(16).padStart(2, '0')
  const b = Math.round(color.b).toString(16).padStart(2, '0')
  if (color.a < 1) {
    const a = Math.round(color.a * 255)
      .toString(16)
      .padStart(2, '0')
    return `#${r}${g}${b}${a}`
  }
  return `#${r}${g}${b}`
}

function swatchVars(color: string): CSSProperties {
  return { '--swatch-color': color } as CSSProperties
}

interface BrushToolbarProps {
  tool: 'brush' | 'eraser' | 'select' | 'picker' | 'fill'
  brushSize: 1 | 3
  brushShape: 'square' | 'circle'
  selectedColor: string
  isPlaying: boolean
  frameCount: number
  currentFrame: number
  usedColors: string[]
  canUndo: boolean
  canRedo: boolean
  onToolChange: (
    tool: 'brush' | 'eraser' | 'select' | 'picker' | 'fill',
  ) => void
  onBrushSizeChange: (size: 1 | 3) => void
  onBrushShapeChange: (shape: 'square' | 'circle') => void
  onColorChange: (color: string) => void
  onIsEraseChange: (isErase: boolean) => void
  onCloneFrame: (source: number) => void
  onClearFrame: () => void
  onTogglePlaying: () => void
  onUndo: () => void
  onRedo: () => void
}

export function BrushToolbar({
  tool,
  brushSize,
  brushShape,
  selectedColor,
  isPlaying,
  frameCount,
  currentFrame,
  usedColors,
  canUndo,
  canRedo,
  onToolChange,
  onBrushSizeChange,
  onBrushShapeChange,
  onColorChange,
  onIsEraseChange,
  onCloneFrame,
  onClearFrame,
  onTogglePlaying,
  onUndo,
  onRedo,
}: BrushToolbarProps) {
  const [colorOpen, setColorOpen] = useState(false)
  const [pickerColor, setPickerColor] = useState<RgbaColor>(() =>
    hexToRgba(selectedColor),
  )

  const canCloneFromPrevious = currentFrame > 0

  const handlePickerChange = (color: RgbaColor) => {
    setPickerColor(color)
    onColorChange(rgbaToHex(color))
  }

  // Combine palette colors with used colors, removing duplicates and transparent
  const allColors = Array.from(
    new Set([
      ...TAILWIND_PALETTE,
      ...usedColors.filter((c) => c !== 'transparent'),
    ]),
  )

  return (
    <div className="flex items-center gap-2 p-3 bg-card border flex-wrap">
      {/* Undo/Redo */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          onClick={onUndo}
          disabled={!canUndo || isPlaying}
          title="Undo (Ctrl+Z)"
        >
          <Undo2 className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          onClick={onRedo}
          disabled={!canRedo || isPlaying}
          title="Redo (Ctrl+Y)"
        >
          <Redo2 className="w-4 h-4" />
        </Button>
      </div>

      <div className="w-px h-6 bg-border" />

      {/* Brush/Eraser toggle */}
      <div className="flex items-center gap-1">
        <Button
          variant={tool === 'select' ? 'default' : 'outline'}
          onClick={() => onToolChange('select')}
          disabled={isPlaying}
          title="Select (V)"
        >
          <MousePointer2 className="w-4 h-4 mr-1" />
          <Kbd>V</Kbd>
        </Button>
        <Button
          variant={tool === 'brush' ? 'default' : 'outline'}
          onClick={() => {
            onToolChange('brush')
            onIsEraseChange(false)
          }}
          disabled={isPlaying}
          title="Brush (B)"
        >
          <Brush className="w-4 h-4 mr-1" />
          <Kbd>B</Kbd>
        </Button>
        <Button
          variant={tool === 'eraser' ? 'default' : 'outline'}
          onClick={() => {
            onToolChange('eraser')
            onIsEraseChange(true)
          }}
          disabled={isPlaying}
          title="Eraser (E)"
        >
          <Eraser className="w-4 h-4 mr-1" />
          <Kbd>E</Kbd>
        </Button>
        <Button
          variant={tool === 'picker' ? 'default' : 'outline'}
          onClick={() => {
            onToolChange('picker')
            onIsEraseChange(false)
          }}
          disabled={isPlaying}
          title="Pick Color (X)"
        >
          <Pipette className="w-4 h-4 mr-1" />
          <Kbd>X</Kbd>
        </Button>
        <Button
          variant={tool === 'fill' ? 'default' : 'outline'}
          onClick={() => {
            onToolChange('fill')
            onIsEraseChange(false)
          }}
          disabled={isPlaying}
          title="Fill (F)"
        >
          <PaintBucket className="w-4 h-4 mr-1" />
          <Kbd>F</Kbd>
        </Button>
      </div>

      <div className="w-px h-6 bg-border" />

      {/* Brush Size */}
      <div className="flex items-center gap-1">
        <span className="text-sm text-muted-foreground mr-1">Size:</span>
        {([1, 3] as const).map((size) => (
          <Button
            key={size}
            variant={brushSize === size ? 'default' : 'outline'}
            onClick={() => onBrushSizeChange(size)}
            disabled={isPlaying || tool === 'select' || tool === 'fill'}
            className="size-8"
          >
            {size}
          </Button>
        ))}
      </div>

      <div className="w-px h-6 bg-border" />

      {/* Brush Shape */}
      <div className="flex items-center gap-1">
        <span className="text-sm text-muted-foreground mr-1">Shape:</span>
        {(['square', 'circle'] as const).map((shape) => (
          <Button
            key={shape}
            variant={brushShape === shape ? 'default' : 'outline'}
            onClick={() => onBrushShapeChange(shape)}
            disabled={isPlaying || tool === 'select' || tool === 'fill'}
            className="size-8"
            title={shape === 'square' ? 'Square brush' : 'Circle brush'}
          >
            {shape === 'square' ? (
              <Square className="w-4 h-4" />
            ) : (
              <Circle className="w-4 h-4" />
            )}
          </Button>
        ))}
      </div>

      <div className="w-px h-6 bg-border" />

      {/* Color picker */}
      <DropdownMenu
        open={colorOpen}
        onOpenChange={(open) => {
          setColorOpen(open)
          if (open) {
            setPickerColor(hexToRgba(selectedColor))
          }
        }}
      >
        <DropdownMenuTrigger
          render={<Button variant="outline" disabled={isPlaying} />}
        >
          <span
            className="w-4 h-4 border bg-(--swatch-color)"
            style={swatchVars(selectedColor)}
          />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" sideOffset={8} className="w-70">
          <div className="p-3">
            {/* Used colors section */}
            {usedColors.length > 0 && (
              <>
                <div className="text-xs text-muted-foreground mb-2">Used</div>
                <div className="flex gap-1 flex-wrap mb-3">
                  {usedColors
                    .filter((c) => c !== 'transparent')
                    .map((color) => (
                      <Button
                        key={color}
                        variant="ghost"
                        className="w-6 h-6 p-0 border-2 bg-(--swatch-color) border-transparent data-[selected=true]:border-primary"
                        onClick={() => {
                          setPickerColor(hexToRgba(color))
                          onColorChange(color)
                          setColorOpen(false)
                        }}
                        data-selected={selectedColor === color}
                        style={swatchVars(color)}
                      />
                    ))}
                </div>
                <DropdownMenuSeparator className="my-2" />
              </>
            )}

            <div className="text-xs text-muted-foreground mb-2">Palette</div>
            <div className="flex gap-1 flex-wrap">
              {allColors.map((color) => (
                <Button
                  key={color}
                  variant="ghost"
                  className="w-6 h-6 p-0 border bg-(--swatch-color) border-border data-[selected=true]:border-primary"
                  onClick={() => {
                    setPickerColor(hexToRgba(color))
                    onColorChange(color)
                    setColorOpen(false)
                  }}
                  data-selected={selectedColor === color}
                  style={swatchVars(color)}
                />
              ))}
            </div>
            <DropdownMenuSeparator className="my-2" />
            <div className="flex justify-center">
              <RgbaColorPicker
                color={pickerColor}
                onChange={handlePickerChange}
              />
            </div>
            <div className="mt-2 flex items-center gap-2">
              <input
                type="text"
                value={selectedColor}
                onChange={(e) => {
                  const color = e.target.value
                  setPickerColor(hexToRgba(color))
                  onColorChange(color)
                }}
                className="w-24 px-2 py-1 text-sm font-mono border bg-background"
              />
            </div>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Clone from previous */}
      {canCloneFromPrevious && !isPlaying && (
        <Button
          variant="outline"
          onClick={() => onCloneFrame(currentFrame - 1)}
          title="Clone from previous frame (P)"
        >
          <Copy className="w-4 h-4 mr-1" />
          Prev
          <Kbd className="ml-1">P</Kbd>
        </Button>
      )}

      {/* Clone from frame dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="outline" disabled={isPlaying} />}
        >
          <Copy className="w-4 h-4 mr-1" />
          Clone
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" sideOffset={8}>
          <div className="px-2 py-1.5 text-xs text-muted-foreground">
            Copy from
          </div>
          {Array.from({ length: frameCount }).map((_, i) => (
            <DropdownMenuItem
              key={i}
              disabled={i === currentFrame || isPlaying}
              onClick={() => onCloneFrame(i)}
            >
              Frame {i + 1}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Clear */}
      <Button variant="outline" onClick={onClearFrame} disabled={isPlaying}>
        Clear
        <Kbd className="ml-1">C</Kbd>
      </Button>

      {/* Play/Pause */}
      <Button onClick={onTogglePlaying}>
        {isPlaying ? '⏸ Pause' : '▶ Play'}
      </Button>
    </div>
  )
}
