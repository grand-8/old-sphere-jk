import type { LifeTrajectory } from "@/lib/data-generator"

export interface JobtrekStatistics {
  improvementPercentage: number
  progressionBreakdown: {
    progressionPercentage: number
    stagnationPercentage: number
    regressionPercentage: number
    totalCount: number
  }
  topPostJobtrekEvents: Array<{ event: string; percentage: number }>
  measureDistribution: { mistJobtrek: number; jobtrekSchool: number; total: number }
  simpleComparison: { beforeAvg: number; afterAvg: number }
  impactCharts: {
    mistJobtrek: { startAvg: number; jobtrekAvg: number; finalAvg: number }
    jobtrekSchool: { startAvg: number; jobtrekAvg: number; finalAvg: number }
  }
}

// Fonction pour détecter si un événement est lié à Jobtrek
function isJobtrekEvent(eventName: string): boolean {
  return (
    eventName.includes("Mesure MISt Jobtrek") || eventName.includes("JobtrekSchool") || eventName.includes("Jobtrek")
  )
}

// Fonction pour trouver le premier événement Jobtrek dans une trajectoire
function findFirstJobtrekYear(trajectory: LifeTrajectory): number | null {
  for (const point of trajectory.points) {
    if (isJobtrekEvent(point.event)) {
      return point.year
    }
  }
  return null
}

// Fonction pour calculer la comparaison simple avant/après
function calculateSimpleBeforeAfter(trajectories: LifeTrajectory[]): { beforeAvg: number; afterAvg: number } {
  let totalBeforeAvg = 0
  let totalAfterAvg = 0
  let validTrajectories = 0

  trajectories.forEach((trajectory) => {
    const firstJobtrekYear = findFirstJobtrekYear(trajectory)
    if (!firstJobtrekYear) return

    // Calculer la moyenne avant Jobtrek pour cette trajectoire
    const beforePoints = trajectory.points.filter((p) => p.year < firstJobtrekYear)
    const afterPoints = trajectory.points.filter((p) => p.year > firstJobtrekYear)

    if (beforePoints.length === 0 || afterPoints.length === 0) return

    const beforeAvg = beforePoints.reduce((sum, p) => sum + p.cumulativeScore, 0) / beforePoints.length
    const afterAvg = afterPoints.reduce((sum, p) => sum + p.cumulativeScore, 0) / afterPoints.length

    totalBeforeAvg += beforeAvg
    totalAfterAvg += afterAvg
    validTrajectories++
  })

  return {
    beforeAvg: validTrajectories > 0 ? totalBeforeAvg / validTrajectories : 0,
    afterAvg: validTrajectories > 0 ? totalAfterAvg / validTrajectories : 0,
  }
}

// Fonction principale pour calculer les statistiques Jobtrek
export function calculateJobtrekStatistics(trajectories: LifeTrajectory[]): JobtrekStatistics {
  const trajectoriesWithJobtrek = trajectories.filter((t) => findFirstJobtrekYear(t) !== null && t.points.length >= 3)

  if (trajectoriesWithJobtrek.length === 0) {
    return {
      improvementPercentage: 0,
      progressionBreakdown: {
        progressionPercentage: 0,
        stagnationPercentage: 0,
        regressionPercentage: 0,
        totalCount: 0,
      },
      topPostJobtrekEvents: [],
      measureDistribution: { mistJobtrek: 0, jobtrekSchool: 0, total: 0 },
      simpleComparison: { beforeAvg: 0, afterAvg: 0 },
      impactCharts: {
        mistJobtrek: { startAvg: 0, jobtrekAvg: 0, finalAvg: 0 },
        jobtrekSchool: { startAvg: 0, jobtrekAvg: 0, finalAvg: 0 },
      },
    }
  }

  // 1. Calculer le pourcentage d'amélioration
  const improvementPercentage = calculateImprovementPercentage(trajectoriesWithJobtrek)

  // 2. Calculer la répartition progression vs stagnation/régression
  const progressionBreakdown = calculateProgressionBreakdown(trajectoriesWithJobtrek)

  // 3. Calculer le top 5 des événements post-Jobtrek
  const topPostJobtrekEvents = calculateTopPostJobtrekEvents(trajectoriesWithJobtrek)

  // 4. Calculer la répartition des mesures
  const measureDistribution = calculateMeasureDistribution(trajectoriesWithJobtrek)

  // 5. Calculer la comparaison simple
  const simpleComparison = calculateSimpleBeforeAfter(trajectoriesWithJobtrek)

  // 6. Calculer les graphiques d'impact séparés
  const impactCharts = calculateSeparateImpactCharts(trajectoriesWithJobtrek)

  return {
    improvementPercentage,
    progressionBreakdown,
    topPostJobtrekEvents,
    measureDistribution,
    simpleComparison,
    impactCharts,
  }
}

export function calculateImprovementPercentage(trajectories: LifeTrajectory[]): number {
  console.log("[v0] STAT MODAL - calculateImprovementPercentage called with", trajectories.length, "trajectories")

  let totalImprovements = 0
  let validTrajectories = 0

  trajectories.forEach((trajectory, index) => {
    const individualImprovement = calculateIndividualImprovement(trajectory)
    console.log(
      `[v0] STAT MODAL - Trajectory ${index} (${trajectory.userCode}): improvement = ${individualImprovement}%`,
    )

    // Inclure toutes les trajectoires qui ont un calcul valide (même 0%)
    const firstJobtrekYear = findFirstJobtrekYear(trajectory)
    if (firstJobtrekYear) {
      totalImprovements += individualImprovement
      validTrajectories++
      console.log(
        `[v0] STAT MODAL - Added trajectory ${trajectory.userCode}: running total = ${totalImprovements}, valid count = ${validTrajectories}`,
      )
    } else {
      console.log(`[v0] STAT MODAL - Skipped trajectory ${trajectory.userCode}: no Jobtrek year found`)
    }
  })

  if (validTrajectories === 0) return 0

  // Retourner la moyenne des améliorations individuelles
  const result = Math.round(totalImprovements / validTrajectories)
  console.log(`[v0] STAT MODAL - Final result: ${result}% (total: ${totalImprovements}, valid: ${validTrajectories})`)

  return result
}

function calculateTopPostJobtrekEvents(trajectories: LifeTrajectory[]): Array<{ event: string; percentage: number }> {
  const eventCounts: { [event: string]: number } = {}
  let totalPostJobtrekEvents = 0

  trajectories.forEach((trajectory) => {
    const firstJobtrekYear = findFirstJobtrekYear(trajectory)
    if (!firstJobtrekYear) return

    // Compter les événements après Jobtrek (exclure les événements Jobtrek eux-mêmes)
    const postJobtrekEvents = trajectory.points.filter(
      (p) => p.year > firstJobtrekYear && !isJobtrekEvent(p.event) && p.event !== "Année stable",
    )

    postJobtrekEvents.forEach((point) => {
      eventCounts[point.event] = (eventCounts[point.event] || 0) + 1
      totalPostJobtrekEvents++
    })
  })

  // Trier par fréquence et prendre le top 5
  const sortedEvents = Object.entries(eventCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([event, count]) => ({
      event,
      percentage: Math.round((count / totalPostJobtrekEvents) * 100),
    }))

  return sortedEvents
}

function calculateMeasureDistribution(trajectories: LifeTrajectory[]): {
  mistJobtrek: number
  jobtrekSchool: number
  total: number
} {
  let mistJobtrek = 0
  let jobtrekSchool = 0

  trajectories.forEach((trajectory) => {
    let hasMist = false
    let hasSchool = false

    trajectory.points.forEach((point) => {
      if (point.event.includes("Mesure MISt Jobtrek")) {
        hasMist = true
      }
      if (point.event.includes("JobtrekSchool")) {
        hasSchool = true
      }
    })

    // Une trajectoire peut avoir les deux, on compte selon la priorité
    if (hasMist) {
      mistJobtrek++
    } else if (hasSchool) {
      jobtrekSchool++
    }
  })

  return {
    mistJobtrek,
    jobtrekSchool,
    total: mistJobtrek + jobtrekSchool,
  }
}

// Fonction pour calculer l'amélioration individuelle après Jobtrek
export function calculateIndividualImprovement(trajectory: LifeTrajectory): number {
  const firstJobtrekYear = findFirstJobtrekYear(trajectory)

  if (!firstJobtrekYear) return 0

  // Trouver le point Jobtrek pour obtenir le score au moment de Jobtrek
  const jobtrekPoint = trajectory.points.find((p) => p.year === firstJobtrekYear && isJobtrekEvent(p.event))
  const afterPoints = trajectory.points.filter((p) => p.year > firstJobtrekYear)

  if (!jobtrekPoint || afterPoints.length === 0) return 0

  // Comparer le score cumulatif AU MOMENT de Jobtrek avec le score final
  const jobtrekScore = jobtrekPoint.cumulativeScore
  const finalScore = afterPoints[afterPoints.length - 1].cumulativeScore

  if (jobtrekScore === 0) {
    // Si le score de départ est 0, calculer la différence absolue comme pourcentage
    // Utiliser une base de 1 pour éviter la division par zéro tout en montrant la régression
    return finalScore < 0 ? Math.round(finalScore * 100) : Math.round(finalScore * 100)
  }

  const improvement = ((finalScore - jobtrekScore) / Math.abs(jobtrekScore)) * 100

  return Math.round(improvement)
}

function calculateProgressionBreakdown(trajectories: LifeTrajectory[]): {
  progressionPercentage: number
  stagnationPercentage: number
  regressionPercentage: number
  totalCount: number
} {
  let progressionCount = 0
  let stagnationCount = 0
  let regressionCount = 0
  let totalCount = 0

  trajectories.forEach((trajectory) => {
    const individualImprovement = calculateIndividualImprovement(trajectory)
    const firstJobtrekYear = findFirstJobtrekYear(trajectory)

    if (firstJobtrekYear) {
      totalCount++
      if (individualImprovement > 0) {
        progressionCount++
      } else if (individualImprovement === 0) {
        stagnationCount++
      } else {
        regressionCount++
      }
    }
  })

  const progressionPercentage = totalCount > 0 ? Math.round((progressionCount / totalCount) * 100) : 0
  const stagnationPercentage = totalCount > 0 ? Math.round((stagnationCount / totalCount) * 100) : 0
  const regressionPercentage = totalCount > 0 ? Math.round((regressionCount / totalCount) * 100) : 0

  return {
    progressionPercentage,
    stagnationPercentage,
    regressionPercentage,
    totalCount,
  }
}

function calculateSeparateImpactCharts(trajectories: LifeTrajectory[]): {
  mistJobtrek: { startAvg: number; jobtrekAvg: number; finalAvg: number }
  jobtrekSchool: { startAvg: number; jobtrekAvg: number; finalAvg: number }
} {
  const mistTrajectories = trajectories.filter((trajectory) =>
    trajectory.points.some((p) => p.event.includes("Mesure MISt Jobtrek")),
  )

  const schoolTrajectories = trajectories.filter(
    (trajectory) =>
      trajectory.points.some((p) => p.event.includes("JobtrekSchool")) &&
      !trajectory.points.some((p) => p.event.includes("Mesure MISt Jobtrek")),
  )

  const calculateAverages = (trajectories: LifeTrajectory[]) => {
    if (trajectories.length === 0) return { startAvg: 0, jobtrekAvg: 0, finalAvg: 0 }

    let totalStart = 0,
      totalJobtrek = 0,
      totalFinal = 0
    let validCount = 0

    trajectories.forEach((trajectory) => {
      const firstJobtrekYear = findFirstJobtrekYear(trajectory)
      if (!firstJobtrekYear) return

      // 1. Score au début du parcours (premier point)
      const startScore = trajectory.points[0]?.cumulativeScore || 0

      // 2. Score au moment de Jobtrek
      const jobtrekPoint = trajectory.points.find((p) => p.year === firstJobtrekYear && isJobtrekEvent(p.event))
      if (!jobtrekPoint) return

      // 3. Score final (dernier point)
      const finalScore = trajectory.points[trajectory.points.length - 1]?.cumulativeScore || 0

      totalStart += startScore
      totalJobtrek += jobtrekPoint.cumulativeScore
      totalFinal += finalScore
      validCount++
    })

    return {
      startAvg: validCount > 0 ? totalStart / validCount : 0,
      jobtrekAvg: validCount > 0 ? totalJobtrek / validCount : 0,
      finalAvg: validCount > 0 ? totalFinal / validCount : 0,
    }
  }

  return {
    mistJobtrek: calculateAverages(mistTrajectories),
    jobtrekSchool: calculateAverages(schoolTrajectories),
  }
}
