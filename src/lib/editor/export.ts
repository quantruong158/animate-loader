import type { Frame, Project } from './types'
import { createEmptyFrame } from './types'

const PROJECT_JSON_VERSION = 1

interface ProjectFileV1 {
  version: 1
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

  const cells = Array.from({ length: gridSize }, (_, rowIndex) => {
    const row = gridCells[rowIndex]
    if (!Array.isArray(row)) {
      return Array.from({ length: gridSize }, () => 'transparent')
    }

    return Array.from({ length: gridSize }, (_, colIndex) => {
      const cell = row[colIndex]
      return typeof cell === 'string' ? cell : 'transparent'
    })
  })

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
  const frames = framesValue.map((frame) => normalizeFrame(frame, gridSize))

  return {
    gridSize,
    frameCount: frames.length > 0 ? frames.length : 1,
    frameRate,
    frames: frames.length > 0 ? frames : [createEmptyFrame(gridSize)],
  }
}

export function exportProjectJSON(project: Project): string {
  const payload: ProjectFileV1 = {
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
  const { gridSize, frameCount, frameRate, frames } = project
  const cellSize = 10
  const svgSize = gridSize * cellSize
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
      for (let f = 0; f < frameCount; f++) {
        const cell = frames[f].grid.cells[r][c]
        colors.push(cell === 'transparent' ? 'none' : cell)
      }

      if (colors.every((col) => col === 'none')) continue

      const x = c * cellSize
      const y = r * cellSize

      const runs: Array<{ startFrame: number; color: string }> = [
        { startFrame: 0, color: colors[0] },
      ]

      for (let f = 1; f < frameCount; f++) {
        if (colors[f] !== colors[f - 1]) {
          runs.push({ startFrame: f, color: colors[f] })
        }
      }

      if (runs.length === 1) {
        rects.push(
          `<rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" fill="${runs[0].color}"/>`,
        )
        continue
      }

      const timelineKey = runs
        .map((run) => `${run.startFrame}:${run.color}`)
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

      rects.push(
        `<rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" fill="${runs[0].color}" style="animation:${animationName} ${totalDuration}s step-end infinite"/>`,
      )
    }
  }

  const styleContent = styleBlocks.join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgSize} ${svgSize}" width="${svgSize}" height="${svgSize}"><style>${styleContent}</style>${rects.join('')}</svg>`
}

export function downloadSVG(project: Project, filename = 'loader.svg') {
  const svg = exportSVG(project)
  downloadBlob(new Blob([svg], { type: 'image/svg+xml' }), filename)
}
