import type { Chart as ChartJS } from "chart.js"
import type { LifeTrajectory } from "@/types/trajectory"

export function applyPeakFinesse(baseColor: string, intensity = 0.3): string {
  const hex = baseColor.replace("#", "")
  const r = Number.parseInt(hex.substr(0, 2), 16)
  const g = Number.parseInt(hex.substr(2, 2), 16)
  const b = Number.parseInt(hex.substr(4, 2), 16)

  const whiteR = 255
  const whiteG = 255
  const whiteB = 255

  const finalR = Math.round(r + (whiteR - r) * intensity)
  const finalG = Math.round(g + (whiteG - g) * intensity)
  const finalB = Math.round(b + (whiteB - b) * intensity)

  return `rgb(${finalR}, ${finalG}, ${finalB})`
}

export function calculateDistanceToLineSegment(
  mouseX: number,
  mouseY: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): number {
  const A = mouseX - x1
  const B = mouseY - y1
  const C = x2 - x1
  const D = y2 - y1

  const dot = A * C + B * D
  const lenSq = C * C + D * D

  if (lenSq === 0) return Math.sqrt(A * A + B * B)

  let param = dot / lenSq
  param = Math.max(0, Math.min(1, param))

  const xx = x1 + param * C
  const yy = y1 + param * D

  const dx = mouseX - xx
  const dy = mouseY - yy

  return Math.sqrt(dx * dx + dy * dy)
}

export function findClosestTrajectoryToMouse(
  chart: ChartJS<"line">,
  mouseX: number,
  mouseY: number,
  maxDistance = 25,
): string | null {
  let closestTrajectoryId: string | null = null
  let minDistance = Number.POSITIVE_INFINITY

  const isThreePointView = (chart.config?.options as any)?.isThreePointView || false

  chart.data.datasets.forEach((dataset: any, datasetIndex) => {
    const meta = chart.getDatasetMeta(datasetIndex)
    if (!meta.visible) return

    const hasTrajectoryId = dataset.trajectoryId && dataset.trajectoryId !== "undefined"
    if (!hasTrajectoryId) return

    for (let i = 0; i < meta.data.length - 1; i++) {
      const point1 = meta.data[i]
      const point2 = meta.data[i + 1]

      if (!point1 || !point2) continue

      const segmentDistance = calculateDistanceToLineSegment(mouseX, mouseY, point1.x, point1.y, point2.x, point2.y)

      if (segmentDistance < minDistance) {
        minDistance = segmentDistance
        closestTrajectoryId = dataset.trajectoryId
      }
    }
  })

  if (minDistance <= maxDistance) {
    console.log(`[v0] FIND_CLOSEST - Found: ${closestTrajectoryId} (distance: ${minDistance.toFixed(1)})`)
    return closestTrajectoryId
  } else {
    return null
  }
}

export function createActiveElementsFromTrajectoryId(
  chart: ChartJS<"line">,
  trajectoryId: string | null,
  mouseX: number,
): any[] {
  if (!trajectoryId) return []

  const datasetIndex = chart.data.datasets.findIndex((dataset: any) => dataset.trajectoryId === trajectoryId)
  if (datasetIndex === -1) return []

  const meta = chart.getDatasetMeta(datasetIndex)
  if (!meta.data || meta.data.length === 0) return []

  let closestPointIndex = 0
  let minDistance = Number.POSITIVE_INFINITY

  meta.data.forEach((point, index) => {
    const distance = Math.abs(point.x - mouseX)
    if (distance < minDistance) {
      minDistance = distance
      closestPointIndex = index
    }
  })

  return [
    {
      datasetIndex,
      index: closestPointIndex,
      element: meta.data[closestPointIndex],
    },
  ]
}

export interface CustomTooltipProps {
  trajectory: LifeTrajectory | null
  position: { x: number; y: number }
  visible: boolean
}
