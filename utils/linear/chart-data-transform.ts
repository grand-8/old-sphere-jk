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
    sortedYears = ["Avant Jobtrek", "Jobtrek", "Étape finale"]

    processedTrajectories = trajectories.map((trajectory) => {
      const sortedPoints = [...trajectory.points].sort((a, b) => a.year - b.year)

      const beforeJobtrek = sortedPoints[0]
      const jobtrekPoint =
        sortedPoints.find(
          (p) => p.event.toLowerCase().includes("jobtrek") || p.categorie.toLowerCase().includes("jobtrek"),
        ) || sortedPoints[Math.floor(sortedPoints.length / 2)]
      const finalPoint = sortedPoints[sortedPoints.length - 1]

      return {
        ...trajectory,
        points: [
          { ...beforeJobtrek, year: 0 },
          { ...jobtrekPoint, year: 1 },
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
  return sortedYears.map((yearOrLabel, index) => {
    if (isThreePointView) {
      const validScores = processedTrajectories
        .map((trajectory) => {
          const point = trajectory.points.find((p) => p.year === index)
          return point ? point.cumulativeScore : null
        })
        .filter((score) => score !== null) as number[]

      return validScores.length > 0 ? validScores.reduce((sum, score) => sum + score, 0) / validScores.length : null
    } else {
      const validScores = trajectories
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
    // Fallback to original logic if no trajectories provided
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

  // This line shows progression percentages relative to the total improvement from Jobtrek to Final
  // The data represents how much of the total progression has been achieved at each stage
  if (sortedYears.length === 3) {
    const beforeAverageScore = averageData[0] // Index 0 is "Avant Jobtrek" point
    const jobtrekAverageScore = averageData[1] // Index 1 is Jobtrek point
    const finalAverageScore = averageData[2] // Index 2 is Final point

    if (beforeAverageScore === null || jobtrekAverageScore === null || finalAverageScore === null) {
      return [null, null, null]
    }

    const totalProgression = finalAverageScore - beforeAverageScore
    const jobtrekProgression = jobtrekAverageScore - beforeAverageScore

    // Calculate what percentage of the total progression Jobtrek represents
    const jobtrekProgressionPercentage = totalProgression !== 0 ? (jobtrekProgression / totalProgression) * 100 : 0

    const jobtrekToFinalPercentage = calculateJobtrekToFinalProgression(trajectories)

    // The progression line displays percentages relative to the total progression
    // Starting from Jobtrek at its relative position to Final at 100%
    return [
      null, // No data for "Avant" point - line starts from Jobtrek
      jobtrekProgressionPercentage, // Start at the percentage that Jobtrek represents in the total progression
      100, // End at 100% representing the complete progression to final stage
    ]
  }

  // For non-three-point view, use original logic
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
) {
  let displayData = averageData
  if (isThreePointView === false) {
    // In full display mode, show only first and last points for a straight line
    const validIndices = averageData.map((value, index) => ({ value, index })).filter((item) => item.value !== null)

    if (validIndices.length >= 2) {
      const firstIndex = validIndices[0].index
      const lastIndex = validIndices[validIndices.length - 1].index

      displayData = averageData.map((value, index) => {
        if (index === firstIndex || index === lastIndex) {
          return value
        }
        return null
      })
    }
  }

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
    averageData: averageData,
    yAxisID: "y",
    isAverage: true,
    isProgression: false,
  }
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

// Helper functions from linear-chart.tsx for consistency
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

    // Find the point immediately before the Jobtrek event
    const jobtrekIndex = trajectory.points.findIndex((p) => p === jobtrekPoint)
    if (jobtrekIndex <= 0) return // No previous point available

    const previousPoint = trajectory.points[jobtrekIndex - 1]

    // Calculate improvement from previous point to Jobtrek using same logic as calculateIndividualImprovement
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

    if (hasJobtrek) {
      totalImprovements += improvement
      validTrajectories++
    }
  })

  return validTrajectories > 0 ? Math.round(totalImprovements / validTrajectories) : 0
}
