import type { Project } from "./types";

export function exportSVG(project: Project): string {
  const { gridSize, frameCount, frameRate, frames } = project;
  const cellSize = 10;
  const svgSize = gridSize * cellSize;
  const totalDuration = frameCount / frameRate;

  const styleBlocks: string[] = [];
  const rects: string[] = [];

  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      const colors: (string | null)[] = [];
      for (let f = 0; f < frameCount; f++) {
        const cell = frames[f].grid.cells[r][c];
        colors.push(cell === "transparent" ? null : cell);
      }

      if (colors.every((col) => col === null)) continue;

      const x = c * cellSize;
      const y = r * cellSize;
      const animId = `a${r}_${c}`;

      const keyTimes = Array.from({ length: frameCount }, (_, i) => i / frameCount);
      const fillValues = colors.map((col) => col || "none");
      const opacityValues = colors.map((col) => (col !== null ? "1" : "0"));

      const fallbackFill = colors.find((col) => col !== null) || "#000000";

      const fillFrames = keyTimes.map((t, i) => `${(t * 100).toFixed(4)}% { fill: ${fillValues[i]}; }`).join(" ");
      const opacityFrames = keyTimes.map((t, i) => `${(t * 100).toFixed(4)}% { opacity: ${opacityValues[i]}; }`).join(" ");

      styleBlocks.push(
        `@keyframes ${animId}_fill { ${fillFrames} }`,
        `@keyframes ${animId}_opacity { ${opacityFrames} }`
      );

      rects.push(
        `<rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" fill="${fallbackFill}" style="animation: ${animId}_fill ${totalDuration}s step-end infinite, ${animId}_opacity ${totalDuration}s step-end infinite;"/>`
      );
    }
  }

  const styleContent = styleBlocks.join("\n");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgSize} ${svgSize}" width="${svgSize}" height="${svgSize}">\n<style>\n${styleContent}\n</style>\n${rects.join("\n")}\n</svg>`;
}

export function downloadSVG(project: Project, filename = "loader.svg") {
  const svg = exportSVG(project);
  const blob = new Blob([svg], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
