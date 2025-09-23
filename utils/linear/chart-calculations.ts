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
  maxDistance = 15,
): string | null {
  let closestTrajectoryId: string | null = null
  let minDistance = maxDistance

  const isThreePointView = (chart.config?.options as any)?.isThreePointView || false
  console.log(`[v0] FIND_CLOSEST_UTILS - View: ${isThreePointView ? "SIMPLIFIED" : "COMPLETE"}`)
  console.log(`[v0] FIND_CLOSEST_UTILS - Starting search with maxDistance: ${maxDistance}`)
  console.log(`[v0] FIND_CLOSEST_UTILS - Mouse at: (${mouseX.toFixed(1)}, ${mouseY.toFixed(1)})`)

  chart.data.datasets.forEach((dataset: any, datasetIndex) => {
    const meta = chart.getDatasetMeta(datasetIndex)
    if (!meta.visible) {
      console.log(`[v0] FIND_CLOSEST_UTILS - Skipping invisible dataset ${datasetIndex}`)
      return
    }

    console.log(
      `[v0] FIND_CLOSEST_UTILS - Checking dataset ${datasetIndex} (${dataset.trajectoryId || "no ID"}) with ${meta.data.length} points`,
    )

    for (let i = 0; i < meta.data.length - 1; i++) {
      const point1 = meta.data[i]
      const point2 = meta.data[i + 1]

      if (!point1 || !point2) continue

      const distance = calculateDistanceToLineSegment(mouseX, mouseY, point1.x, point1.y, point2.x, point2.y)

      if (distance < 50) {
        // Only log close segments to avoid spam
        console.log(
          `[v0] FIND_CLOSEST_UTILS - Segment ${i}-${i + 1}: distance=${distance.toFixed(2)}, points=(${point1.x.toFixed(1)},${point1.y.toFixed(1)}) to (${point2.x.toFixed(1)},${point2.y.toFixed(1)})`,
        )
      }

      if (distance < minDistance) {
        minDistance = distance
        closestTrajectoryId = dataset.trajectoryId
        console.log(
          `[v0] FIND_CLOSEST_UTILS - NEW CLOSEST: ${closestTrajectoryId || "NONE"} at distance ${distance.toFixed(2)}`,
        )
      }
    }
  })

  console.log(
    `[v0] FIND_CLOSEST_UTILS - Final result: ${closestTrajectoryId || "NONE"} at distance ${minDistance.toFixed(2)}`,
  )
  return closestTrajectoryId
}

export function createActiveElementsFromTrajectoryId(
  chart: ChartJS<"line">,
  trajectoryId: string | null,
  mouseX: number,
): any[] {
  if (!trajectoryId) return []

  // Find the dataset index for this trajectory
  const datasetIndex = chart.data.datasets.findIndex((dataset: any) => dataset.trajectoryId === trajectoryId)
  if (datasetIndex === -1) return []

  // Find the closest data point index based on mouse X position
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

  // Create a fake active element that Chart.js tooltip system expects
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
