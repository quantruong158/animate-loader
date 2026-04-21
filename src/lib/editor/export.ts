import type { Frame, Project, Cell } from './types'
import { createEmptyFrame, migrateCell } from './types'

const PROJECT_JSON_VERSION = 2

interface ProjectFileV2 {
  version: 2
  project: Project
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readPositiveInteger(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null
  const parsed = Math.floor(value)
  return parsed > 0 ? parsed : null
}

function readPositiveNumber(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return null
  }
  return value
}

function normalizeFrame(frame: unknown, gridSize: number): Frame {
  if (!isRecord(frame) || !isRecord(frame.grid)) {
    return createEmptyFrame(gridSize)
  }

  const gridCells = frame.grid.cells
  if (!Array.isArray(gridCells)) {
    return createEmptyFrame(gridSize)
  }

  const cells: Cell[][] = []
  for (let rowIndex = 0; rowIndex < gridSize; rowIndex++) {
    const row = gridCells[rowIndex]
    if (!Array.isArray(row)) {
      const newRow: Cell[] = Array.from({ length: gridSize }, () => 'transparent')
      cells.push(newRow)
    } else {
      const newRow: Cell[] = []
      for (let colIndex = 0; colIndex < gridSize; colIndex++) {
        newRow.push(migrateCell(row[colIndex]))
      }
      cells.push(newRow)
    }
  }

  return {
    grid: {
      size: gridSize,
      cells,
    },
  }
}

function normalizeProject(value: unknown): Project {
  const projectData =
    isRecord(value) && isRecord(value.project) ? value.project : value

  if (!isRecord(projectData)) {
    throw new Error('Invalid project JSON: expected an object')
  }

  const framesValue = Array.isArray(projectData.frames)
    ? projectData.frames
    : []
  const inferredGridSize =
    readPositiveInteger(projectData.gridSize) ??
    (framesValue.length > 0 &&
    isRecord(framesValue[0]) &&
    isRecord(framesValue[0].grid)
      ? readPositiveInteger(framesValue[0].grid.size)
      : null)

  if (inferredGridSize == null) {
    throw new Error('Invalid project JSON: missing grid size')
  }

  const gridSize = inferredGridSize
  const frameRate = readPositiveNumber(projectData.frameRate) ?? 12
  const gapSize = typeof projectData.gapSize === 'number' ? Math.max(0, Math.min(8, projectData.gapSize)) : 0
  const frames = framesValue.map((frame) => normalizeFrame(frame, gridSize))

  return {
    gridSize,
    frameCount: frames.length > 0 ? frames.length : 1,
    frameRate,
    gapSize,
    frames: frames.length > 0 ? frames : [createEmptyFrame(gridSize)],
  }
}

export function exportProjectJSON(project: Project): string {
  const payload: ProjectFileV2 = {
    version: PROJECT_JSON_VERSION,
    project: {
      ...project,
      frameCount: project.frames.length,
    },
  }

  return JSON.stringify(payload, null, 2)
}

export function parseProjectJSON(json: string): Project {
  return normalizeProject(JSON.parse(json))
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function downloadProjectJSON(
  project: Project,
  filename = 'loader.json',
) {
  const json = exportProjectJSON(project)
  downloadBlob(new Blob([json], { type: 'application/json' }), filename)
}

export function exportSVG(project: Project): string {
  const { gridSize, frameCount, frameRate, frames, gapSize } = project
  const cellSize = 50
  const svgSize = gridSize * cellSize + (gridSize - 1) * gapSize
  const totalDuration = frameCount / frameRate

  const formatPercent = (value: number): string => {
    const rounded = Number(value.toFixed(4))
    return Number.isInteger(rounded) ? `${rounded}` : `${rounded}`
  }

  const styleBlocks: string[] = []
  const animationByTimeline = new Map<string, string>()
  let animationCounter = 0
  const rects: string[] = []

  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      const colors: string[] = []
      const shapes: ('square' | 'circle')[] = []
      for (let f = 0; f < frameCount; f++) {
        const cell = frames[f].grid.cells[r][c]
        colors.push(cell === 'transparent' ? 'none' : cell.color)
        shapes.push(cell === 'transparent' ? 'square' : cell.shape)
      }

      if (colors.every((col) => col === 'none')) continue

      const x = c * (cellSize + gapSize)
      const y = r * (cellSize + gapSize)

      const runs: Array<{ startFrame: number; color: string; shape: 'square' | 'circle' }> = [
        { startFrame: 0, color: colors[0], shape: shapes[0] },
      ]

      for (let f = 1; f < frameCount; f++) {
        if (colors[f] !== colors[f - 1] || shapes[f] !== shapes[f - 1]) {
          runs.push({ startFrame: f, color: colors[f], shape: shapes[f] })
        }
      }

      const shape = runs[0].shape

      if (runs.length === 1) {
        if (shape === 'circle') {
          rects.push(
            `<circle cx="${x + cellSize / 2}" cy="${y + cellSize / 2}" r="${cellSize / 2}" fill="${runs[0].color}"/>`,
          )
        } else {
          rects.push(
            `<rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" fill="${runs[0].color}"/>`,
          )
        }
        continue
      }

      const timelineKey = runs
        .map((run) => `${run.startFrame}:${run.color}:${run.shape}`)
        .join(';')

      let animationName = animationByTimeline.get(timelineKey)
      if (!animationName) {
        animationName = `k${animationCounter++}`
        const keyframes = runs
          .map((run) => {
            const t = (run.startFrame * 100) / frameCount
            return `${formatPercent(t)}%{fill:${run.color}}`
          })
          .join('')

        const lastColor = runs[runs.length - 1].color
        styleBlocks.push(
          `@keyframes ${animationName}{${keyframes}100%{fill:${lastColor}}}`,
        )
        animationByTimeline.set(timelineKey, animationName)
      }

      if (shape === 'circle') {
        rects.push(
          `<circle cx="${x + cellSize / 2}" cy="${y + cellSize / 2}" r="${cellSize / 2}" fill="${runs[0].color}" style="animation:${animationName} ${totalDuration}s step-end infinite"/>`,
        )
      } else {
        rects.push(
          `<rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" fill="${runs[0].color}" style="animation:${animationName} ${totalDuration}s step-end infinite"/>`,
        )
      }
    }
  }

  const styleContent = styleBlocks.join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgSize} ${svgSize}" width="${svgSize}" height="${svgSize}"><style>${styleContent}</style>${rects.join('')}</svg>`
}

export function downloadSVG(project: Project, filename = 'loader.svg') {
  const svg = exportSVG(project)
  downloadBlob(new Blob([svg], { type: 'image/svg+xml' }), filename)
}

export function exportFrameSVG(frame: Frame, gapSize = 0): string {
  const cellSize = 50
  const svgSize = frame.grid.size * cellSize + (frame.grid.size - 1) * gapSize
  const rects: string[] = []

  for (let r = 0; r < frame.grid.size; r++) {
    for (let c = 0; c < frame.grid.size; c++) {
      const cell = frame.grid.cells[r][c]
      if (cell === 'transparent') continue

      const x = c * (cellSize + gapSize)
      const y = r * (cellSize + gapSize)

      if (cell.shape === 'circle') {
        rects.push(
          `<circle cx="${x + cellSize / 2}" cy="${y + cellSize / 2}" r="${cellSize / 2}" fill="${cell.color}"/>`,
        )
      } else {
        rects.push(
          `<rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" fill="${cell.color}"/>`,
        )
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgSize} ${svgSize}" width="${svgSize}" height="${svgSize}">${rects.join('')}</svg>`
}

export function downloadFrameSVG(frame: Frame, filename = 'frame.svg', gapSize = 0) {
  const svg = exportFrameSVG(frame, gapSize)
  downloadBlob(new Blob([svg], { type: 'image/svg+xml' }), filename)
}
