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
  if (!isRecord(frame) || !isRecord(frame.grid) || !Array.isArray(frame.grid.cells)) {
    return createEmptyFrame(gridSize)
  }

  const cells = Array.from({ length: gridSize }, (_, rowIndex) => {
    const row = frame.grid.cells[rowIndex]
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
  const projectData = isRecord(value) && isRecord(value.project) ? value.project : value

  if (!isRecord(projectData)) {
    throw new Error('Invalid project JSON: expected an object')
  }

  const framesValue = Array.isArray(projectData.frames) ? projectData.frames : []
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

export function downloadProjectJSON(project: Project, filename = 'loader.json') {
  const json = exportProjectJSON(project)
  downloadBlob(new Blob([json], { type: 'application/json' }), filename)
}

export function exportSVG(project: Project): string {
  const { gridSize, frameCount, frameRate, frames } = project
  const cellSize = 10
  const svgSize = gridSize * cellSize
  const totalDuration = frameCount / frameRate

  const styleBlocks: string[] = []
  const rects: string[] = []

  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      const colors: (string | null)[] = []
      for (let f = 0; f < frameCount; f++) {
        const cell = frames[f].grid.cells[r][c]
        colors.push(cell === 'transparent' ? null : cell)
      }

      if (colors.every((col) => col === null)) continue

      const x = c * cellSize
      const y = r * cellSize
      const animId = `a${r}_${c}`

      const keyTimes = Array.from(
        { length: frameCount },
        (_, i) => i / frameCount,
      )
      const fillValues = colors.map((col) => col || 'none')
      const opacityValues = colors.map((col) => (col !== null ? '1' : '0'))

      const fallbackFill = colors.find((col) => col !== null) || '#000000'

      const fillFrames = keyTimes
        .map(
          (t, i) => `${(t * 100).toFixed(4)}% { fill: ${fillValues[i]}; }`,
        )
        .join(' ')
      const opacityFrames = keyTimes
        .map(
          (t, i) => `${(t * 100).toFixed(4)}% { opacity: ${opacityValues[i]}; }`,
        )
        .join(' ')

      styleBlocks.push(
        `@keyframes ${animId}_fill { ${fillFrames} }`,
        `@keyframes ${animId}_opacity { ${opacityFrames} }`,
      )

      rects.push(
        `<rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" fill="${fallbackFill}" style="animation: ${animId}_fill ${totalDuration}s step-end infinite, ${animId}_opacity ${totalDuration}s step-end infinite;"/>`,
      )
    }
  }

  const styleContent = styleBlocks.join('\n')
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgSize} ${svgSize}" width="${svgSize}" height="${svgSize}">\n<style>\n${styleContent}\n</style>\n${rects.join('\n')}\n</svg>`
}

export function downloadSVG(project: Project, filename = 'loader.svg') {
  const svg = exportSVG(project)
  downloadBlob(new Blob([svg], { type: 'image/svg+xml' }), filename)
}
