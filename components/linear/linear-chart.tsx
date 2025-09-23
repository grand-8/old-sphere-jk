"use client"

import React, { useState, useCallback } from "react"
import Chart from "chart.js/auto"
import { Line } from "react-chartjs-2"
import type { LifeTrajectory } from "@/lib/data-service"
import { applyPeakFinesse } from "@/utils/linear/chart-calculations"
import { Plus, Minus, RotateCcw } from "lucide-react"
import { useChartInteractions } from "@/hooks/linear/use-chart-interactions"
import { PEAK_COLORS, CHART_LAYOUT, CHART_SCALES, LABEL_ALIGNMENT_STYLES } from "@/config/chart-styles"
import {
  processTrajectories,
  calculateAverageData,
  calculateProgressionData,
  createTrajectoryDataset,
  createAverageDataset,
  createProgressionDataset,
  calculateJobtrekToFinalProgression,
} from "@/utils/linear/chart-data-transform"
import { StatisticsModal } from "@/components/statistics-modal"
import { calculateJobtrekStatistics } from "@/lib/statistics-calculator"

const customLabelAlignmentPlugin = {
  id: "customLabelAlignment",
  afterDraw: (chart: any) => {
    const { ctx, scales } = chart
    const xScale = scales.x
    const yScale = scales.y

    const isThreePointView = chart.config.options.isThreePointView
    if (!isThreePointView) return

    const labels = ["Avant Jobtrek", "Jobtrek", "Étape finale"]
    const alignments = LABEL_ALIGNMENT_STYLES.alignments

    ctx.save()
    ctx.fillStyle = LABEL_ALIGNMENT_STYLES.fillStyle
    ctx.font = LABEL_ALIGNMENT_STYLES.font

    labels.forEach((label, index) => {
      const x = xScale.getPixelForValue(index)
      const y = yScale.bottom + LABEL_ALIGNMENT_STYLES.yOffset

      ctx.textAlign = alignments[index] as CanvasTextAlign
      ctx.fillText(label, x, y)
    })

    ctx.restore()
  },
}

Chart.register(customLabelAlignmentPlugin)

function createPeakInspiredGradient(
  ctx: CanvasRenderingContext2D,
  chartArea: any,
  data: (number | null)[],
  isHighlighted = false,
) {
  if (isHighlighted) {
    const gradient = ctx.createLinearGradient(chartArea.left, 0, chartArea.right, 0)
    gradient.addColorStop(0, applyPeakFinesse(PEAK_COLORS.highlight, 0))
    gradient.addColorStop(1, applyPeakFinesse(PEAK_COLORS.highlight, 0))
    return gradient
  }

  const segments: Array<{ start: number; end: number; isProgression: boolean }> = []
  let currentSegmentStart = 0
  let currentTrend: "progression" | "regression" | null = null

  for (let i = 1; i < data.length; i++) {
    const prevValue = data[i - 1]
    const currentValue = data[i]

    if (prevValue !== null && currentValue !== null) {
      const isProgressing = currentValue > prevValue
      const newTrend = isProgressing ? "progression" : "regression"

      if (currentTrend === null) {
        currentTrend = newTrend
        currentSegmentStart = i - 1
      } else if (currentTrend !== newTrend) {
        segments.push({
          start: currentSegmentStart,
          end: i - 1,
          isProgression: currentTrend === "progression",
        })
        currentTrend = newTrend
        currentSegmentStart = i - 1
      }
    }
  }

  if (currentTrend !== null) {
    segments.push({
      start: currentSegmentStart,
      end: data.length - 1,
      isProgression: currentTrend === "progression",
    })
  }

  const gradient = ctx.createLinearGradient(chartArea.left, 0, chartArea.right, 0)

  if (segments.length === 0) {
    const neutralColor = applyPeakFinesse(PEAK_COLORS.blue, 0.3)
    gradient.addColorStop(0, neutralColor)
    gradient.addColorStop(1, neutralColor)
    return gradient
  }

  const totalPoints = data.length - 1

  segments.forEach((segment, index) => {
    const startPos = segment.start / totalPoints
    const endPos = segment.end / totalPoints

    if (segment.isProgression) {
      const startColor = applyPeakFinesse(PEAK_COLORS.blue, 0.2)
      const endColor = applyPeakFinesse(PEAK_COLORS.green, 0.4)
      gradient.addColorStop(startPos, startColor)
      gradient.addColorStop(endPos, endColor)
    } else {
      const startColor = applyPeakFinesse(PEAK_COLORS.green, 0.2)
      const endColor = applyPeakFinesse(PEAK_COLORS.blue, 0.4)
      gradient.addColorStop(startPos, startColor)
      gradient.addColorStop(endPos, endColor)
    }
  })

  return gradient
}

interface LinearChartProps {
  trajectories: LifeTrajectory[]
}

interface AverageTooltipProps {
  averageData: (number | null)[]
  position: { x: number; y: number }
  visible: boolean
  isThreePointView: boolean
  isProgression: boolean
  trajectories: LifeTrajectory[]
  onStatisticsClick?: () => void
}

function AverageTooltip({
  averageData,
  position,
  visible,
  isThreePointView,
  isProgression,
  trajectories,
  onStatisticsClick,
}: AverageTooltipProps) {
  if (!visible || !averageData) return null

  const validScores = averageData.filter((score) => score !== null) as number[]
  if (validScores.length < 2) return null

  const jobtrekToFinalProgression = calculateJobtrekToFinalProgression(trajectories)

  let progressionData
  if (isThreePointView && validScores.length === 3) {
    const beforeJobtrek = validScores[0]
    const jobtrekScore = validScores[1]
    const finalScore = validScores[2]

    progressionData = {
      beforeToJobtrek: 0,
      jobtrekToFinal: jobtrekToFinalProgression,
      overall: jobtrekToFinalProgression,
      scores: { beforeJobtrek, jobtrekScore, finalScore },
    }
  } else {
    progressionData = {
      overall: jobtrekToFinalProgression,
      scores: { firstScore: validScores[0], lastScore: validScores[validScores.length - 1] },
    }
  }

  return (
    <div
      className="fixed z-50 pointer-events-none"
      style={{
        left: position.x + 10,
        top: position.y - 10,
        transform: "translateY(-100%)",
      }}
    >
      <div className="bg-black text-white rounded-lg border border-gray-700 p-3 shadow-lg min-w-[200px]">
        <div className="text-white font-semibold mb-2">
          {isProgression ? "Progression relative (%)" : "Moyenne de tous les parcours"}
        </div>
        <div className="space-y-1 text-sm">
          {isThreePointView && progressionData.jobtrekToFinal !== undefined ? (
            <>
              {!isProgression &&
                progressionData.beforeToJobtrek !== undefined &&
                progressionData.beforeToJobtrek !== 0 && (
                  <div className="text-gray-300">
                    <span className="text-gray-400">Avant → Jobtrek:</span>
                    <span
                      className={progressionData.beforeToJobtrek >= 0 ? "text-green-400 ml-1" : "text-red-400 ml-1"}
                    >
                      {progressionData.beforeToJobtrek >= 0 ? "+" : ""}
                      {progressionData.beforeToJobtrek}%
                    </span>
                  </div>
                )}
              <div className="text-gray-300">
                <span className="text-gray-400">{isProgression ? "Progression:" : "Jobtrek → Finale:"}</span>
                <span className={progressionData.jobtrekToFinal >= 0 ? "text-green-400 ml-1" : "text-red-400 ml-1"}>
                  {progressionData.jobtrekToFinal >= 0 ? "+" : ""}
                  {progressionData.jobtrekToFinal}%
                </span>
              </div>
              {!isProgression && progressionData.overall !== progressionData.jobtrekToFinal && (
                <div className="text-gray-300 border-t border-gray-600 pt-1 mt-1">
                  <span className="text-gray-400">Progression totale:</span>
                  <span className={progressionData.overall >= 0 ? "text-green-400 ml-1" : "text-red-400 ml-1"}>
                    {progressionData.overall >= 0 ? "+" : ""}
                    {progressionData.overall}%
                  </span>
                </div>
              )}
            </>
          ) : (
            <div className="text-gray-300">
              <span className="text-gray-400">Progression:</span>
              <span className={progressionData.overall >= 0 ? "text-green-400 ml-1" : "text-red-400 ml-1"}>
                {progressionData.overall >= 0 ? "+" : ""}
                {progressionData.overall}%
              </span>
            </div>
          )}

          {onStatisticsClick && (
            <div
              className="text-blue-400 text-xs mt-2 cursor-pointer hover:text-blue-300 transition-colors pointer-events-auto"
              onClick={onStatisticsClick}
            >
              Voir les statistiques globales
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export function LinearChart({ trajectories }: LinearChartProps) {
  const [isThreePointView, setIsThreePointView] = useState(true)
  const [hoveredLineId, setHoveredLineId] = useState<string | null>(null)
  const [showStatistics, setShowStatistics] = useState(false)

  const chartData = React.useMemo(() => {
    if (!trajectories || trajectories.length === 0) {
      return { labels: [], datasets: [] }
    }

    const { sortedYears, processedTrajectories } = processTrajectories(trajectories, isThreePointView)

    const datasets = processedTrajectories.map((trajectory) => {
      const isHighlighted = hoveredLineId === trajectory.id
      return createTrajectoryDataset(trajectory, sortedYears, isThreePointView, "highlighted", isHighlighted)
    })

    if (trajectories.length > 1) {
      const averageData = calculateAverageData(sortedYears, processedTrajectories, trajectories, isThreePointView)
      const progressionData = calculateProgressionData(sortedYears, averageData, trajectories)

      if (!isThreePointView) {
        datasets.push(createAverageDataset(averageData, "highlighted"))
      }
      datasets.push(createProgressionDataset(progressionData, "highlighted", averageData))
    }

    return {
      labels: sortedYears,
      datasets,
    }
  }, [trajectories, isThreePointView, hoveredLineId])

  const {
    chartRef,
    hoveredTrajectory,
    isHoveringLine,
    tooltipState,
    averageTooltipState,
    zoomLevel,
    isPanMode,
    handleHover,
    handleClick,
    handleZoomIn,
    handleZoomOut,
    handleReset,
    determineTrajectoryType,
  } = useChartInteractions(trajectories, chartData)

  const handleOpenStatistics = useCallback(() => {
    setShowStatistics(true)
  }, [])

  const handleCloseStatistics = useCallback(() => {
    setShowStatistics(false)
  }, [])

  const enhancedHandleHover = useCallback(
    (event: any, elements: any[], chart: any) => {
      if (!chart || !event.native) {
        handleHover(event, elements, chart)
        setHoveredLineId(null)
        return
      }

      const rect = chart.canvas.getBoundingClientRect()
      const mouseX = (event.native as MouseEvent).clientX - rect.left
      const mouseY = (event.native as MouseEvent).clientY - rect.top

      const closestTrajectoryId = findClosestTrajectoryToMouse(chart, mouseX, mouseY, 25)

      if (closestTrajectoryId) {
        setHoveredLineId(closestTrajectoryId)

        const trajectory = trajectories.find((t) => t.id === closestTrajectoryId)
        if (trajectory) {
          const syntheticElements = [
            {
              datasetIndex: chart.data.datasets.findIndex((d: any) => d.trajectoryId === closestTrajectoryId),
              index: 0,
            },
          ]
          handleHover(event, syntheticElements, chart)
        }
      } else {
        setHoveredLineId(null)
        handleHover(event, [], chart)
      }
    },
    [handleHover, trajectories],
  )

  const enhancedHandleClick = useCallback(
    (event: any, elements: any[], chart: any) => {
      if (!chart || !event.native) {
        handleClick(event, elements, chart)
        return
      }

      const rect = chart.canvas.getBoundingClientRect()
      const mouseX = (event.native as MouseEvent).clientX - rect.left
      const mouseY = (event.native as MouseEvent).clientY - rect.top

      const progressionDataset = chart.data.datasets.find((d: any) => d.isProgression)
      if (progressionDataset) {
        const datasetIndex = chart.data.datasets.indexOf(progressionDataset)
        const meta = chart.getDatasetMeta(datasetIndex)

        if (meta.visible) {
          for (let i = 0; i < meta.data.length - 1; i++) {
            const point1 = meta.data[i] as any
            const point2 = meta.data[i + 1] as any

            if (!point1 || !point2) continue

            const distance = calculateDistanceToLineSegment(mouseX, mouseY, point1.x, point1.y, point2.x, point2.y)

            if (distance < 15) {
              handleOpenStatistics()
              return
            }
          }
        }
      }

      handleClick(event, elements, chart)
    },
    [handleClick, handleOpenStatistics],
  )

  const options: any = React.useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      layout: CHART_LAYOUT,
      interaction: {
        mode: "nearest",
        intersect: false,
      },
      plugins: {
        customLabelAlignment: {
          enabled: true,
        },
        legend: {
          display: false,
        },
        tooltip: {
          enabled: false,
          external: () => {},
        },
      },
      scales: {
        x: {
          title: {
            display: true,
            text: isThreePointView ? "Périodes" : "Années",
            color: CHART_SCALES.x.title.color,
            font: CHART_SCALES.x.title.font,
            padding: CHART_SCALES.x.title.padding,
          },
          ticks: {
            color: CHART_SCALES.x.ticks.color,
            maxRotation: CHART_SCALES.x.ticks.maxRotation,
            display: !isThreePointView,
            callback: function (value, index, ticks) {
              return this.getLabelForValue(value as number)
            },
          },
          grid: {
            color: CHART_SCALES.x.grid.color,
          },
          offset: CHART_SCALES.x.offset,
        },
        y: {
          type: "linear",
          display: true,
          position: "left",
          title: {
            display: true,
            text: "Progression des parcours",
            color: CHART_SCALES.y.title.color,
            font: CHART_SCALES.y.title.font,
          },
          ticks: {
            display: false,
          },
          grid: {
            color: CHART_SCALES.y.grid.color,
          },
          afterDataLimits: (scale) => {
            const chart = scale.chart as any
            const isZoomedOrPanned = chart.isZoomedOrPanned && chart.isZoomedOrPanned()

            if (isZoomedOrPanned) {
              return
            }

            const range = scale.max - scale.min
            const center = (scale.max + scale.min) / 2
            const newRange = range / zoomLevel
            const newMin = center - newRange / 2
            const newMax = center + newRange / 2

            scale.min = newMin
            scale.max = newMax
          },
        },
        y1: {
          type: "linear",
          display: true,
          position: "right",
          title: {
            display: true,
            text: "Progression (%)",
            color: applyPeakFinesse(PEAK_COLORS.accent, 0),
            font: CHART_SCALES.y1.title.font,
          },
          min: CHART_SCALES.y1.min,
          max: CHART_SCALES.y1.max,
          ticks: {
            color: applyPeakFinesse(PEAK_COLORS.accent, 0.7),
            stepSize: CHART_SCALES.y1.ticks.stepSize,
            callback: (value) => value + "%",
          },
          grid: CHART_SCALES.y1.grid,
        },
      },
      onHover: enhancedHandleHover,
      onClick: enhancedHandleClick,
      isThreePointView: isThreePointView,
    }),
    [
      chartData,
      hoveredTrajectory,
      isHoveringLine,
      isThreePointView,
      trajectories,
      zoomLevel,
      isPanMode,
      enhancedHandleHover,
      enhancedHandleClick,
    ],
  )

  const statistics = showStatistics ? calculateJobtrekStatistics(trajectories) : null

  return (
    <div className="w-full h-full bg-transparent relative pb-16 pr-8">
      <div
        className="fixed z-50 pointer-events-none"
        style={{
          left: tooltipState.position.x + 10,
          top: tooltipState.position.y - 10,
          transform: "translateY(-100%)",
        }}
      >
        {tooltipState.visible && tooltipState.trajectory && (
          <div className="bg-black text-white rounded-lg border border-gray-700 p-3 shadow-lg min-w-[200px]">
            <div className="text-white font-semibold mb-2">Parcours de {tooltipState.trajectory.userCode}</div>
            <div className="space-y-1 text-sm">
              <div className="text-gray-300">
                <span className="text-gray-400">Type:</span> {determineTrajectoryType(tooltipState.trajectory)}
              </div>
              <div className="text-gray-300">
                <span className="text-gray-400">Début:</span>{" "}
                {tooltipState.trajectory.points[0]?.year || new Date().getFullYear()}
              </div>
              <div className="text-gray-300">
                <span className={tooltipState.trajectory.progressionPercent >= 0 ? "text-green-400" : "text-red-400"}>
                  {tooltipState.trajectory.progressionPercent >= 0 ? "+" : ""}
                  {tooltipState.trajectory.progressionPercent}%
                </span>
              </div>
              <div className="text-blue-400 text-xs mt-2 cursor-pointer">Cliquez pour voir le profil</div>
            </div>
          </div>
        )}
      </div>
      <AverageTooltip
        averageData={averageTooltipState.averageData}
        position={averageTooltipState.position}
        visible={averageTooltipState.visible}
        isThreePointView={isThreePointView}
        isProgression={averageTooltipState.isProgression}
        trajectories={trajectories}
        onStatisticsClick={handleOpenStatistics}
      />

      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
        <button
          onClick={handleZoomIn}
          className="w-8 h-8 bg-white/10 hover:bg-white/20 border border-white/20 rounded-full flex items-center justify-center text-white transition-colors"
          title="Zoom avant (Y)"
        >
          <Plus size={16} />
        </button>
        <button
          onClick={handleZoomOut}
          className="w-8 h-8 bg-white/10 hover:bg-white/20 border border-white/20 rounded-full flex items-center justify-center text-white transition-colors"
          title="Zoom arrière (Y)"
        >
          <Minus size={16} />
        </button>
        <button
          onClick={handleReset}
          className="w-8 h-8 bg-white/10 hover:bg-white/20 border border-white/20 rounded-full flex items-center justify-center text-white transition-colors"
          title="Réinitialiser zoom et position"
        >
          <RotateCcw size={16} />
        </button>
      </div>

      <div className="absolute top-4 right-12 z-10 flex gap-2">
        <button
          onClick={() => setIsThreePointView(!isThreePointView)}
          className={`px-3 py-1 text-white text-sm rounded-md border border-white/20 transition-colors ${
            isThreePointView ? "bg-white/20 hover:bg-white/30" : "bg-white/10 hover:bg-white/20"
          }`}
          title={isThreePointView ? "Affichage complet" : "Affichage simplifié"}
        >
          {isThreePointView ? "Vue complète" : "Vue simplifiée"}
        </button>
      </div>

      <div className="absolute bottom-4 left-4 text-white/60 text-xs">
        <br />
      </div>

      <Line ref={chartRef} data={chartData} options={options} />

      {showStatistics && <StatisticsModal statistics={statistics} onClose={handleCloseStatistics} />}
    </div>
  )
}

function findClosestTrajectoryToMouse(chart: any, mouseX: number, mouseY: number, maxDistance = 20): string | null {
  let closestTrajectoryId: string | null = null
  let minDistance = maxDistance

  chart.data.datasets.forEach((dataset: any, datasetIndex) => {
    if (dataset.isAverage || dataset.isProgression || !dataset.trajectoryId) return

    const meta = chart.getDatasetMeta(datasetIndex)
    if (!meta.visible) return

    for (let i = 0; i < meta.data.length - 1; i++) {
      const point1 = meta.data[i] as any
      const point2 = meta.data[i + 1] as any

      if (!point1 || !point2) continue

      const distance = calculateDistanceToLineSegment(mouseX, mouseY, point1.x, point1.y, point2.x, point2.y)

      if (distance < minDistance) {
        minDistance = distance
        closestTrajectoryId = dataset.trajectoryId
      }
    }
  })

  return closestTrajectoryId
}

function calculateDistanceToLineSegment(
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
