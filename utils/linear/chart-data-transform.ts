import type { LifeTrajectory } from "@/lib/data-service"
import { PEAK_COLORS, DATASET_STYLES } from "@/config/chart-styles"
import { applyPeakFinesse } from "./chart-calculations"
import { calculateIndividualImprovement } from "@/lib/statistics-calculator"

export function processTrajectories(
  trajectories: LifeTrajectory[],
  isThreePointView: boolean,
): {
  sortedYears: (number | string)[]
  processedTrajectories: LifeTrajectory[]
} {
  if (!trajectories || trajectories.length === 0) {
    return { sortedYears: [], processedTrajectories: [] }
  }

  let sortedYears: (number | string)[]
  let processedTrajectories: LifeTrajectory[]

  if (isThreePointView) {
    sortedYears = ["Avant Jobtrek", "Pré-Jobtrek", "Étape finale"]

    processedTrajectories = trajectories.map((trajectory) => {
      const sortedPoints = [...trajectory.points].sort((a, b) => a.year - b.year)

      const beforeJobtrek = sortedPoints[0]

      const jobtrekPointIndex = sortedPoints.findIndex(
        (p) => p.event.toLowerCase().includes("jobtrek") || p.categorie.toLowerCase().includes("jobtrek"),
      )

      const preJobtrekPoint =
        jobtrekPointIndex > 0 ? sortedPoints[jobtrekPointIndex - 1] : sortedPoints[Math.floor(sortedPoints.length / 2)]

      const finalPoint = sortedPoints[sortedPoints.length - 1]

      return {
        ...trajectory,
        points: [
          { ...beforeJobtrek, year: 0 },
          { ...preJobtrekPoint, year: 1 },
          { ...finalPoint, year: 2 },
        ],
      }
    })
  } else {
    const allYears = new Set<number>()
    trajectories.forEach((trajectory) => {
      trajectory.points.forEach((point) => {
        allYears.add(point.year)
      })
    })
    sortedYears = Array.from(allYears).sort((a, b) => a - b)
    processedTrajectories = trajectories
  }

  return { sortedYears, processedTrajectories }
}

export function calculateAverageData(
  sortedYears: (number | string)[],
  processedTrajectories: LifeTrajectory[],
  trajectories: LifeTrajectory[],
  isThreePointView: boolean,
): (number | null)[] {
  const filteredTrajectories = isThreePointView ? processedTrajectories : trajectories
  const trajectoriesWithProgression = filteredTrajectories.filter((trajectory) => {
    const individualImprovement = calculateIndividualImprovement(trajectory)
    const firstJobtrekYear = findFirstJobtrekYear(trajectory)
    return firstJobtrekYear && individualImprovement !== 0
  })

  console.log("[v0] CALCULATE_AVERAGE_DEBUG - Total trajectories:", filteredTrajectories.length)
  console.log("[v0] CALCULATE_AVERAGE_DEBUG - Trajectories with progression:", trajectoriesWithProgression.length)

  return sortedYears.map((yearOrLabel, index) => {
    if (isThreePointView) {
      const validScores = trajectoriesWithProgression
        .map((trajectory) => {
          const point = trajectory.points.find((p) => p.year === index)
          console.log(
            `[v0] CALCULATE_AVERAGE_DEBUG - Trajectory ${trajectory.id}, looking for year ${index}, found:`,
            point?.cumulativeScore || "null",
          )
          return point ? point.cumulativeScore : null
        })
        .filter((score) => score !== null) as number[]

      console.log(
        `[v0] CALCULATE_AVERAGE_DEBUG - Index ${index}, valid scores:`,
        validScores.length,
        "values:",
        validScores,
      )

      return validScores.length > 0 ? validScores.reduce((sum, score) => sum + score, 0) / validScores.length : null
    } else {
      const validScores = trajectoriesWithProgression
        .map((trajectory) => {
          const point = trajectory.points.find((p) => p.year === yearOrLabel)
          return point ? point.cumulativeScore : null
        })
        .filter((score) => score !== null) as number[]

      return validScores.length > 0 ? validScores.reduce((sum, score) => sum + score, 0) / validScores.length : null
    }
  })
}

export function calculateProgressionData(
  sortedYears: (number | string)[],
  averageData: (number | null)[],
  trajectories?: LifeTrajectory[],
): (number | null)[] {
  if (!trajectories || trajectories.length === 0) {
    return sortedYears.map((yearOrLabel, index) => {
      if (index === 0) return 0
      const currentScore = averageData[index]
      const previousScore = averageData[index - 1]
      if (currentScore === null || previousScore === null) return null
      const jobtrekIndex = Math.floor(sortedYears.length / 2)
      const jobtrekScore = averageData[jobtrekIndex]
      if (jobtrekScore === null || jobtrekScore === 0) return 0
      const progression = ((currentScore - jobtrekScore) / Math.abs(jobtrekScore)) * 100
      return Math.max(0, Math.min(100, progression))
    })
  }

  if (sortedYears.length === 3) {
    const beforeJobtrek = averageData[0]
    const preJobtrekPoint = averageData[1]
    const finalPoint = averageData[2]

    if (beforeJobtrek !== null && preJobtrekPoint !== null && finalPoint !== null) {
      const segment1Progression = ((preJobtrekPoint - beforeJobtrek) / Math.abs(beforeJobtrek)) * 100
      const segment2Progression = ((finalPoint - preJobtrekPoint) / Math.abs(preJobtrekPoint)) * 100
      const totalProgression = ((finalPoint - beforeJobtrek) / Math.abs(beforeJobtrek)) * 100

      console.log("[v0] THREE_POINT_ANALYSIS - Point 1 (Avant Jobtrek):", beforeJobtrek.toFixed(2))
      console.log("[v0] THREE_POINT_ANALYSIS - Point 2 (Pré-Jobtrek):", preJobtrekPoint.toFixed(2))
      console.log("[v0] THREE_POINT_ANALYSIS - Point 3 (Final):", finalPoint.toFixed(2))
      console.log(
        "[v0] THREE_POINT_ANALYSIS - Segment 1 progression (Avant → Pré-Jobtrek):",
        segment1Progression.toFixed(2) + "%",
      )
      console.log(
        "[v0] THREE_POINT_ANALYSIS - Segment 2 progression (Pré-Jobtrek → Final):",
        segment2Progression.toFixed(2) + "%",
      )
      console.log("[v0] THREE_POINT_ANALYSIS - Total progression (Avant → Final):", totalProgression.toFixed(2) + "%")
    }
  }

  return sortedYears.map((yearOrLabel, index) => {
    if (index === 0) return 0
    const currentScore = averageData[index]
    const previousScore = averageData[index - 1]
    if (currentScore === null || previousScore === null) return null
    const jobtrekIndex = Math.floor(sortedYears.length / 2)
    const jobtrekScore = averageData[jobtrekIndex]
    if (jobtrekScore === null || jobtrekScore === 0) return 0
    const progression = ((currentScore - jobtrekScore) / Math.abs(jobtrekScore)) * 100
    return Math.max(0, Math.min(100, progression))
  })
}

export function createPeakInspiredGradient(
  ctx: CanvasRenderingContext2D,
  chartArea: any,
  data: (number | null)[],
  isHighlighted: boolean,
): CanvasGradient {
  const gradient = ctx.createLinearGradient(chartArea.left, 0, chartArea.right, 0)

  if (isHighlighted) {
    gradient.addColorStop(0, applyPeakFinesse(PEAK_COLORS.blue, 0.8))
    gradient.addColorStop(0.5, applyPeakFinesse(PEAK_COLORS.accent, 0.6))
    gradient.addColorStop(1, applyPeakFinesse(PEAK_COLORS.blue, 0.8))
  } else {
    gradient.addColorStop(0, applyPeakFinesse(PEAK_COLORS.blue, 0.3))
    gradient.addColorStop(0.5, applyPeakFinesse(PEAK_COLORS.accent, 0.2))
    gradient.addColorStop(1, applyPeakFinesse(PEAK_COLORS.blue, 0.3))
  }

  return gradient
}

export function createTrajectoryDataset(
  trajectory: LifeTrajectory,
  sortedYears: (number | string)[],
  isThreePointView: boolean,
  hoveredTrajectory: string | null,
  isHighlighted: boolean,
) {
  const data = sortedYears.map((yearOrLabel, index) => {
    if (isThreePointView) {
      const point = trajectory.points.find((p) => p.year === index)
      return point ? point.cumulativeScore : null
    } else {
      const point = trajectory.points.find((p) => p.year === yearOrLabel)
      return point ? point.cumulativeScore : null
    }
  })

  const baseOpacity = hoveredTrajectory ? (isHighlighted ? 1 : 0.15) : 0.6

  return {
    label: trajectory.name,
    data,
    borderColor: (context: any) => {
      const chart = context.chart
      const { ctx, chartArea } = chart
      if (!chartArea) return applyPeakFinesse(PEAK_COLORS.blue, 0.3)
      return createPeakInspiredGradient(ctx, chartArea, data, isHighlighted)
    },
    backgroundColor: (context: any) => {
      const chart = context.chart
      const { ctx, chartArea } = chart
      if (!chartArea) return applyPeakFinesse(PEAK_COLORS.blue, 0.5)
      const gradient = createPeakInspiredGradient(ctx, chartArea, data, isHighlighted)
      return gradient
    },
    borderWidth: isHighlighted
      ? DATASET_STYLES.trajectory.borderWidth.highlighted
      : DATASET_STYLES.trajectory.borderWidth.normal,
    hoverBorderColor: applyPeakFinesse(PEAK_COLORS.highlight, 0), // White color for hover
    hoverBorderWidth: 4, // Thicker line when hovered
    hoverBackgroundColor: applyPeakFinesse(PEAK_COLORS.highlight, 0.1), // Subtle white background
    pointRadius: isHighlighted
      ? DATASET_STYLES.trajectory.pointRadius.highlighted
      : DATASET_STYLES.trajectory.pointRadius.normal,
    pointHoverRadius: DATASET_STYLES.trajectory.pointHoverRadius,
    pointBorderColor: (context: any) => {
      const chart = context.chart
      const { ctx, chartArea } = chart
      if (!chartArea) return applyPeakFinesse(PEAK_COLORS.blue, 0.2)
      return createPeakInspiredGradient(ctx, chartArea, data, isHighlighted)
    },
    pointBackgroundColor: (context: any) => {
      const chart = context.chart
      const { ctx, chartArea } = chart
      if (!chartArea) return applyPeakFinesse(PEAK_COLORS.blue, 0.4)
      return createPeakInspiredGradient(ctx, chartArea, data, isHighlighted)
    },
    pointHoverBorderColor: applyPeakFinesse(PEAK_COLORS.highlight, 0), // White border on hover
    pointHoverBackgroundColor: applyPeakFinesse(PEAK_COLORS.highlight, 0.3), // White background on hover
    pointBorderWidth: DATASET_STYLES.trajectory.pointBorderWidth,
    tension: DATASET_STYLES.trajectory.tension,
    fill: DATASET_STYLES.trajectory.fill,
    spanGaps: DATASET_STYLES.trajectory.spanGaps,
    trajectoryId: trajectory.id,
    trajectoryData: trajectory,
    opacity: baseOpacity,
    isAverage: false,
    isProgression: false,
  }
}

export function createAverageDataset(
  averageData: (number | null)[],
  hoveredTrajectory: string | null,
  isThreePointView?: boolean,
  trajectories?: LifeTrajectory[], // Added trajectories parameter to find pre-Jobtrek points
) {
  let displayData = averageData

  console.log("[v0] ===== AVERAGE LINE ANALYSIS =====")
  console.log("[v0] View type:", isThreePointView ? "THREE_POINT_VIEW" : "SIMPLIFIED_VIEW")
  console.log("[v0] Total trajectories:", trajectories?.length || 0)
  console.log("[v0] Average data points:", averageData.length)
  console.log(
    "[v0] Average data values:",
    averageData.map((v) => v?.toFixed(2) || "null"),
  )

  if (isThreePointView === false && trajectories) {
    const trajectoriesWithPostJobtrekProgression = trajectories.filter((trajectory) => {
      const sortedPoints = [...trajectory.points].sort((a, b) => a.year - b.year)

      const jobtrekPointIndex = sortedPoints.findIndex(
        (p) => p.event.toLowerCase().includes("jobtrek") || p.categorie.toLowerCase().includes("jobtrek"),
      )

      return jobtrekPointIndex >= 0 && jobtrekPointIndex < sortedPoints.length - 1
    })

    console.log("[v0] PROGRESSION_ANALYSIS - Total trajectories:", trajectories.length)
    console.log(
      "[v0] PROGRESSION_ANALYSIS - Trajectories with post-Jobtrek progression:",
      trajectoriesWithPostJobtrekProgression.length,
    )

    if (trajectoriesWithPostJobtrekProgression.length === 0) {
      console.log("[v0] PROGRESSION_ANALYSIS - No trajectories with post-Jobtrek progression found")
      return {
        ...createBaseAverageDataset(averageData, hoveredTrajectory),
        data: averageData.map(() => null),
      }
    }

    const validIndices = averageData.map((value, index) => ({ value, index })).filter((item) => item.value !== null)

    if (validIndices.length >= 3) {
      const firstIndex = validIndices[0].index
      const lastIndex = validIndices[validIndices.length - 1].index

      const preJobtrekIndex = findAveragePreJobtrekIndex(trajectoriesWithPostJobtrekProgression, validIndices)

      const firstValue = averageData[firstIndex]
      const preJobtrekValue = averageData[preJobtrekIndex]
      const lastValue = averageData[lastIndex]

      if (firstValue !== null && preJobtrekValue !== null && lastValue !== null) {
        const segment1Progression = ((preJobtrekValue - firstValue) / Math.abs(firstValue)) * 100
        const segment2Progression = ((lastValue - preJobtrekValue) / Math.abs(preJobtrekValue)) * 100
        const totalProgression = ((lastValue - firstValue) / Math.abs(firstValue)) * 100

        console.log("[v0] PROGRESSION_ANALYSIS - Point 1 (First):", firstValue.toFixed(2))
        console.log("[v0] PROGRESSION_ANALYSIS - Point 2 (Pre-Jobtrek):", preJobtrekValue.toFixed(2))
        console.log("[v0] PROGRESSION_ANALYSIS - Point 3 (Final):", lastValue.toFixed(2))
        console.log(
          "[v0] PROGRESSION_ANALYSIS - Segment 1 progression (Point 1 → Point 2):",
          segment1Progression.toFixed(2) + "%",
        )
        console.log(
          "[v0] PROGRESSION_ANALYSIS - Segment 2 progression (Point 2 → Point 3):",
          segment2Progression.toFixed(2) + "%",
        )
        console.log(
          "[v0] PROGRESSION_ANALYSIS - Total progression (Point 1 → Point 3):",
          totalProgression.toFixed(2) + "%",
        )
      }

      displayData = averageData.map((value, index) => {
        if (index === firstIndex || index === preJobtrekIndex || index === lastIndex) {
          return value
        }
        return null
      })
    } else if (validIndices.length >= 2) {
      const firstIndex = validIndices[0].index
      const lastIndex = validIndices[validIndices.length - 1].index

      const firstValue = averageData[firstIndex]
      const lastValue = averageData[lastIndex]

      if (firstValue !== null && lastValue !== null) {
        const totalProgression = ((lastValue - firstValue) / Math.abs(firstValue)) * 100
        console.log("[v0] PROGRESSION_ANALYSIS - 2-point fallback - Point 1:", firstValue.toFixed(2))
        console.log("[v0] PROGRESSION_ANALYSIS - 2-point fallback - Point 2:", lastValue.toFixed(2))
        console.log(
          "[v0] PROGRESSION_ANALYSIS - 2-point fallback - Total progression:",
          totalProgression.toFixed(2) + "%",
        )
      }

      displayData = averageData.map((value, index) => {
        if (index === firstIndex || index === lastIndex) {
          return value
        }
        return null
      })
    }
  } else if (isThreePointView === true && averageData.length === 3) {
    const beforeJobtrek = averageData[0]
    const preJobtrekPoint = averageData[1]
    const finalPoint = averageData[2]

    if (beforeJobtrek !== null && preJobtrekPoint !== null && finalPoint !== null) {
      const segment1Progression = ((preJobtrekPoint - beforeJobtrek) / Math.abs(beforeJobtrek)) * 100
      const segment2Progression = ((finalPoint - preJobtrekPoint) / Math.abs(preJobtrekPoint)) * 100
      const totalProgression = ((finalPoint - beforeJobtrek) / Math.abs(beforeJobtrek)) * 100

      console.log("[v0] THREE_POINT_ANALYSIS - Point 1 (Avant Jobtrek):", beforeJobtrek.toFixed(2))
      console.log("[v0] THREE_POINT_ANALYSIS - Point 2 (Pré-Jobtrek):", preJobtrekPoint.toFixed(2))
      console.log("[v0] THREE_POINT_ANALYSIS - Point 3 (Final):", finalPoint.toFixed(2))
      console.log(
        "[v0] THREE_POINT_ANALYSIS - Segment 1 progression (Avant → Pré-Jobtrek):",
        segment1Progression.toFixed(2) + "%",
      )
      console.log(
        "[v0] THREE_POINT_ANALYSIS - Segment 2 progression (Pré-Jobtrek → Final):",
        segment2Progression.toFixed(2) + "%",
      )
      console.log("[v0] THREE_POINT_ANALYSIS - Total progression (Avant → Final):", totalProgression.toFixed(2) + "%")
    }
  }

  console.log(
    "[v0] Final display data:",
    displayData.map((v) => v?.toFixed(2) || "null"),
  )
  console.log("[v0] ===== END ANALYSIS =====")

  return createBaseAverageDataset(displayData, hoveredTrajectory)
}

function createBaseAverageDataset(displayData: (number | null)[], hoveredTrajectory: string | null) {
  return {
    label: "Moyenne de tous les parcours",
    data: displayData,
    borderColor: (context: any) => {
      const chart = context.chart
      const { ctx, chartArea } = chart
      if (!chartArea) return applyPeakFinesse(PEAK_COLORS.highlight, 0)
      const gradient = ctx.createLinearGradient(chartArea.left, 0, chartArea.right, 0)
      const whiteColor = applyPeakFinesse(PEAK_COLORS.highlight, 0)
      gradient.addColorStop(0, whiteColor)
      gradient.addColorStop(1, whiteColor)
      return gradient
    },
    backgroundColor: applyPeakFinesse(PEAK_COLORS.highlight, 0.3),
    borderWidth:
      hoveredTrajectory === "average"
        ? DATASET_STYLES.average.borderWidth.highlighted
        : DATASET_STYLES.average.borderWidth.normal,
    borderDash:
      hoveredTrajectory === "average"
        ? DATASET_STYLES.average.borderDash.highlighted
        : DATASET_STYLES.average.borderDash.normal,
    hoverBorderColor: applyPeakFinesse(PEAK_COLORS.highlight, 0), // White color for hover
    hoverBorderWidth: 5, // Extra thick line when hovered
    hoverBackgroundColor: applyPeakFinesse(PEAK_COLORS.highlight, 0.2), // Subtle white background
    pointRadius:
      hoveredTrajectory === "average"
        ? DATASET_STYLES.average.pointRadius.highlighted
        : DATASET_STYLES.average.pointRadius.normal,
    pointHoverRadius: DATASET_STYLES.average.pointHoverRadius,
    pointBorderColor: applyPeakFinesse(PEAK_COLORS.highlight, 0),
    pointBackgroundColor: applyPeakFinesse(PEAK_COLORS.highlight, 0.2),
    pointHoverBorderColor: applyPeakFinesse(PEAK_COLORS.highlight, 0), // White border on hover
    pointHoverBackgroundColor: applyPeakFinesse(PEAK_COLORS.highlight, 0.4), // White background on hover
    pointBorderWidth: DATASET_STYLES.average.pointBorderWidth,
    tension: DATASET_STYLES.average.tension,
    fill: DATASET_STYLES.average.fill,
    spanGaps: DATASET_STYLES.average.spanGaps,
    trajectoryId: "average",
    trajectoryData: null,
    opacity:
      hoveredTrajectory && hoveredTrajectory !== "average"
        ? DATASET_STYLES.average.opacity.dimmed
        : DATASET_STYLES.average.opacity.normal,
    averageData: displayData,
    yAxisID: "y",
    isAverage: true,
    isProgression: false,
  }
}

function findAveragePreJobtrekIndex(
  trajectories: LifeTrajectory[],
  validIndices: { value: number | null; index: number }[],
): number {
  const preJobtrekIndices: number[] = []

  trajectories.forEach((trajectory) => {
    const sortedPoints = [...trajectory.points].sort((a, b) => a.year - b.year)

    const jobtrekPointIndex = sortedPoints.findIndex(
      (p) => p.event.toLowerCase().includes("jobtrek") || p.categorie.toLowerCase().includes("jobtrek"),
    )

    if (jobtrekPointIndex > 0) {
      const preJobtrekPoint = sortedPoints[jobtrekPointIndex - 1]

      const correspondingIndex = validIndices.findIndex(
        (item) => item.index === sortedPoints.findIndex((p) => p.year === preJobtrekPoint.year),
      )

      if (correspondingIndex !== -1) {
        preJobtrekIndices.push(validIndices[correspondingIndex].index)
      }
    }
  })

  if (preJobtrekIndices.length > 0) {
    const averageIndex = Math.round(preJobtrekIndices.reduce((sum, idx) => sum + idx, 0) / preJobtrekIndices.length)
    return averageIndex
  }

  return validIndices[Math.floor(validIndices.length / 2)].index
}

export function createProgressionDataset(
  progressionData: (number | null)[],
  hoveredTrajectory: string | null,
  averageData?: (number | null)[],
) {
  return {
    label: "Progression relative (%)",
    data: progressionData,
    borderColor: (context: any) => {
      const chart = context.chart
      const { ctx, chartArea } = chart
      if (!chartArea) return applyPeakFinesse(PEAK_COLORS.accent, 0)
      const gradient = ctx.createLinearGradient(chartArea.left, 0, chartArea.right, 0)
      const accentColor = applyPeakFinesse(PEAK_COLORS.accent, 0)
      gradient.addColorStop(0, accentColor)
      gradient.addColorStop(1, accentColor)
      return gradient
    },
    backgroundColor: applyPeakFinesse(PEAK_COLORS.accent, 0.3),
    borderWidth:
      hoveredTrajectory === "progression"
        ? DATASET_STYLES.progression.borderWidth.highlighted
        : DATASET_STYLES.progression.borderWidth.normal,
    borderDash:
      hoveredTrajectory === "progression"
        ? DATASET_STYLES.progression.borderDash.highlighted
        : DATASET_STYLES.progression.borderDash.normal,
    hoverBorderColor: applyPeakFinesse(PEAK_COLORS.highlight, 0), // White color for hover
    hoverBorderWidth: 5, // Extra thick line when hovered
    hoverBackgroundColor: applyPeakFinesse(PEAK_COLORS.highlight, 0.2), // Subtle white background
    pointRadius:
      hoveredTrajectory === "progression"
        ? DATASET_STYLES.progression.pointRadius.highlighted
        : DATASET_STYLES.progression.pointRadius.normal,
    pointHoverRadius: DATASET_STYLES.progression.pointHoverRadius,
    pointBorderColor: applyPeakFinesse(PEAK_COLORS.accent, 0),
    pointBackgroundColor: applyPeakFinesse(PEAK_COLORS.accent, 0.2),
    pointHoverBorderColor: applyPeakFinesse(PEAK_COLORS.highlight, 0), // White border on hover
    pointHoverBackgroundColor: applyPeakFinesse(PEAK_COLORS.highlight, 0.4), // White background on hover
    pointBorderWidth: DATASET_STYLES.progression.pointBorderWidth,
    tension: DATASET_STYLES.progression.tension,
    fill: DATASET_STYLES.progression.fill,
    spanGaps: DATASET_STYLES.progression.spanGaps,
    trajectoryId: "progression",
    trajectoryData: null,
    opacity:
      hoveredTrajectory && hoveredTrajectory !== "progression"
        ? DATASET_STYLES.progression.opacity.dimmed
        : DATASET_STYLES.progression.opacity.normal,
    progressionData: progressionData,
    actualScoreData: averageData || [],
    yAxisID: "y1",
    isAverage: false,
    isProgression: true,
  }
}

function calculateBeforeToJobtrekProgression(trajectories: LifeTrajectory[]): number {
  if (!trajectories || trajectories.length === 0) return 0

  let totalImprovements = 0
  let validTrajectories = 0

  trajectories.forEach((trajectory) => {
    const jobtrekPoint = trajectory.points.find(
      (p) =>
        p.event.includes("Mesure MISt Jobtrek") || p.event.includes("JobtrekSchool") || p.event.includes("Jobtrek"),
    )

    if (!jobtrekPoint) return

    const jobtrekIndex = trajectory.points.findIndex((p) => p === jobtrekPoint)
    if (jobtrekIndex <= 0) return

    const previousPoint = trajectory.points[jobtrekIndex - 1]

    const previousScore = previousPoint.cumulativeScore
    const jobtrekScore = jobtrekPoint.cumulativeScore

    if (previousScore === 0) {
      const improvement = jobtrekScore < 0 ? Math.round(jobtrekScore * 100) : Math.round(jobtrekScore * 100)
      totalImprovements += improvement
    } else {
      const improvement = ((jobtrekScore - previousScore) / Math.abs(previousScore)) * 100
      totalImprovements += Math.round(improvement)
    }

    validTrajectories++
  })

  return validTrajectories > 0 ? Math.round(totalImprovements / validTrajectories) : 0
}

export function calculateJobtrekToFinalProgression(trajectories: LifeTrajectory[]): number {
  if (!trajectories || trajectories.length === 0) return 0

  let totalImprovements = 0
  let validTrajectories = 0

  trajectories.forEach((trajectory) => {
    const improvement = calculateIndividualImprovement(trajectory)

    const hasJobtrek = trajectory.points.some(
      (p) =>
        p.event.includes("Mesure MISt Jobtrek") || p.event.includes("JobtrekSchool") || p.event.includes("Jobtrek"),
    )

    if (hasJobtrek && improvement !== 0) {
      totalImprovements += improvement
      validTrajectories++
    }
  })

  return validTrajectories > 0 ? Math.round(totalImprovements / validTrajectories) : 0
}

function findFirstJobtrekYear(trajectory: LifeTrajectory): number | null {
  for (const point of trajectory.points) {
    if (
      point.event.includes("Mesure MISt Jobtrek") ||
      point.event.includes("JobtrekSchool") ||
      point.event.includes("Jobtrek")
    ) {
      return point.year
    }
  }
  return null
}
