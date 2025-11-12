"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import type { ChartJS } from "chart.js"
import type { LifeTrajectory } from "@/lib/data-service"
import { findClosestTrajectoryToMouse } from "@/utils/linear/chart-calculations"
import { useLifeTrajectoryStore } from "@/lib/store"
import { calculateIndividualImprovement } from "@/lib/statistics-calculator"
import { calculateJobtrekToFinalProgression } from "@/utils/linear/chart-data-transform"

type TooltipState =
  | {
      visible: false
      position: { x: number; y: number }
    }
  | {
      visible: true
      position: { x: number; y: number }
      type: "trajectory"
      trajectory: LifeTrajectory
    }
  | {
      visible: true
      position: { x: number; y: number }
      type: "average"
      averageData: (number | null)[]
      isProgression: boolean
      progressionPercentages?: { beforeToJobtrek: number; jobtrekToFinal: number }
    }

export function useChartInteractions(trajectories: LifeTrajectory[], chartData: any) {
  const chartRef = useRef<ChartJS<"line"> | null>(null)
  const [hoveredTrajectoryId, setHoveredTrajectoryId] = useState<string | null>(null)
  const [isHoveringLine, setIsHoveringLine] = useState(false)
  const [tooltipState, setTooltipState] = useState<TooltipState>({
    visible: false,
    position: { x: 0, y: 0 },
  })
  const [zoomLevel, setZoomLevel] = useState(1)
  const [isPanMode, setIsPanMode] = useState(false)
  const { setSelectedPerson } = useLifeTrajectoryStore()

  useEffect(() => {
    trajectories.forEach((traj, index) => {
      console.log(`Trajectory ${index}: id=${traj.id}, userCode=${traj.userCode}`)
    })
  }, [trajectories])

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.code === "Space" && chartRef.current) {
      event.preventDefault()
      const chart = chartRef.current

      if (chart.options.plugins?.zoom?.pan) {
        chart.options.plugins.zoom.pan.enabled = true
        chart.canvas.style.cursor = "grab"
      }
    }
  }, [])

  const handleKeyUp = useCallback(
    (event: KeyboardEvent) => {
      if (event.code === "Space" && chartRef.current) {
        const chart = chartRef.current

        if (chart.options.plugins?.zoom?.pan) {
          chart.options.plugins.zoom.pan.enabled = false
          chart.canvas.style.cursor = "default"
        }
      }
    },
    [isHoveringLine],
  )

  useEffect(() => {
    if (typeof window === "undefined") return

    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("keyup", handleKeyUp)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("keyup", handleKeyUp)
    }
  }, [handleKeyDown, handleKeyUp])

  const determineTrajectoryType = useCallback((trajectory: LifeTrajectory): string => {
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

    if (hasMist) {
      return "Mesure MISt Jobtrek"
    } else if (hasSchool) {
      return "JobtrekSchool"
    }

    return trajectory.typeMesure || "JobtrekSchool"
  }, [])

  const updateChartHighlight = useCallback((chart: ChartJS<"line">, activeElements: any[] = []) => {
    chart.setActiveElements(activeElements)
  }, [])

  const lastHoverTime = useRef(0)
  const HOVER_THROTTLE_MS = 50

  const handleHover = useCallback(
    (event: any, activeElements: any, chart: ChartJS<"line">) => {
      if (!chart || !event.native) return

      const now = Date.now()
      if (now - lastHoverTime.current < HOVER_THROTTLE_MS) {
        return
      }
      lastHoverTime.current = now

      if (isPanMode) {
        return
      }

      const rect = chart.canvas.getBoundingClientRect()
      const mouseX = (event.native as MouseEvent).clientX - rect.left
      const mouseY = (event.native as MouseEvent).clientY - rect.top
      const clientX = (event.native as MouseEvent).clientX
      const clientY = (event.native as MouseEvent).clientY

      const isThreePointView = chart.config?.options?.isThreePointView || false

      const maxDistance = 25
      const closestTrajectoryId = findClosestTrajectoryToMouse(chart, mouseX, mouseY, maxDistance)

      if (closestTrajectoryId === "progression") {
        const progressionDataset = chartData.datasets.find(
          (dataset: any) => dataset.trajectoryId === "progression",
        ) as any

        const progressionDatasetIndex = chartData.datasets.findIndex(
          (dataset: any) => dataset.trajectoryId === "progression",
        )

        if (progressionDatasetIndex !== -1) {
          updateChartHighlight(chart, [{ datasetIndex: progressionDatasetIndex, index: 0 }])
        }

        const jobtrekToFinalPercentage = calculateJobtrekToFinalProgression(trajectories)

        setHoveredTrajectoryId("progression")
        setTooltipState({
          visible: true,
          position: { x: clientX, y: clientY },
          type: "average",
          averageData: progressionDataset?.progressionData || [],
          isProgression: true,
          progressionPercentages: {
            beforeToJobtrek: 0,
            jobtrekToFinal: jobtrekToFinalPercentage,
          },
        })
        setIsHoveringLine(true)
        if (event.native?.target) {
          ;(event.native.target as HTMLElement).style.cursor = "pointer"
        }
      } else if (closestTrajectoryId === "average") {
        const averageDataset = chartData.datasets.find((dataset: any) => dataset.trajectoryId === "average") as any

        const averageDatasetIndex = chartData.datasets.findIndex((dataset: any) => dataset.trajectoryId === "average")

        if (averageDatasetIndex !== -1) {
          updateChartHighlight(chart, [{ datasetIndex: averageDatasetIndex, index: 0 }])
        }

        setHoveredTrajectoryId("average")
        setTooltipState({
          visible: true,
          position: { x: clientX, y: clientY },
          type: "average",
          averageData: averageDataset?.averageData || [],
          isProgression: false,
        })
        setIsHoveringLine(true)
        if (event.native?.target) {
          ;(event.native.target as HTMLElement).style.cursor = "pointer"
        }
      } else if (closestTrajectoryId) {
        const trajectoryData = trajectories.find((t) => t.id === closestTrajectoryId)

        const trajectoryDatasetIndex = chartData.datasets.findIndex(
          (dataset: any) => dataset.trajectoryId === closestTrajectoryId,
        )

        if (trajectoryDatasetIndex !== -1) {
          updateChartHighlight(chart, [{ datasetIndex: trajectoryDatasetIndex, index: 0 }])
        }

        if (trajectoryData) {
          const modalProgressionPercent = calculateIndividualImprovement(trajectoryData)
          const trajectoryType = determineTrajectoryType(trajectoryData)
          const sortedPoints = [...trajectoryData.points].sort((a, b) => a.year - b.year)
          const startYear = sortedPoints[0]?.year || new Date().getFullYear()

          const enhancedTrajectoryData = {
            ...trajectoryData,
            trajectoryType,
            progressionPercent: modalProgressionPercent,
            startYear,
          }

          setHoveredTrajectoryId(closestTrajectoryId)
          setTooltipState({
            visible: true,
            position: { x: clientX, y: clientY },
            type: "trajectory",
            trajectory: enhancedTrajectoryData,
          })
        } else {
          setHoveredTrajectoryId(closestTrajectoryId)
          setTooltipState({ visible: false, position: { x: clientX, y: clientY } })
        }

        setIsHoveringLine(true)
        if (event.native?.target) {
          ;(event.native.target as HTMLElement).style.cursor = "pointer"
        }
      } else {
        updateChartHighlight(chart, [])

        setHoveredTrajectoryId(null)
        setTooltipState({ visible: false, position: { x: 0, y: 0 } })
        setIsHoveringLine(false)
        if (event.native?.target) {
          ;(event.native.target as HTMLElement).style.cursor = "default"
        }
      }
    },
    [isPanMode, chartData, trajectories, determineTrajectoryType, updateChartHighlight],
  )

  const handleClick = useCallback(
    (event: any, activeElements: any) => {
      if (hoveredTrajectoryId) {
        const originalTrajectory = trajectories.find((t) => t.id === hoveredTrajectoryId)

        if (originalTrajectory) {
          setSelectedPerson(originalTrajectory)
          if (typeof window !== "undefined") {
            window.history.pushState({}, "", `/?trajectory=${originalTrajectory.userCode}`)
          }
        }
      } else {
        if (activeElements.length > 0) {
          const closestElement = activeElements[0]
          const dataset = chartData.datasets[closestElement.datasetIndex] as any
          const trajectoryId = dataset.trajectoryId

          if (trajectoryId && trajectoryId !== "average") {
            const originalTrajectory = trajectories.find((t) => t.id === trajectoryId)

            if (originalTrajectory) {
              setSelectedPerson(originalTrajectory)
              if (typeof window !== "undefined") {
                window.history.pushState({}, "", `/?trajectory=${originalTrajectory.userCode}`)
              }
            }
          }
        }
      }
    },
    [hoveredTrajectoryId, trajectories, chartData, setSelectedPerson],
  )

  const handleZoomIn = () => {
    setZoomLevel((prevZoomLevel) => prevZoomLevel * 1.2)
  }

  const handleZoomOut = () => {
    setZoomLevel((prevZoomLevel) => prevZoomLevel / 1.2)
  }

  const handleReset = () => {
    if (chartRef.current) {
      if (typeof chartRef.current.resetZoom === "function") {
        chartRef.current.resetZoom()
      } else {
        const chart = chartRef.current
        if (chart.options.scales?.y) {
          delete chart.options.scales.y.min
          delete chart.options.scales.y.max
        }
        chart.update("none")
      }
      setZoomLevel(1)
    }
  }

  return {
    chartRef,
    hoveredTrajectory: hoveredTrajectoryId,
    isHoveringLine,
    tooltipState,
    averageTooltipState:
      tooltipState.visible && tooltipState.type === "average"
        ? {
            visible: true,
            position: tooltipState.position,
            averageData: tooltipState.averageData,
            isProgression: tooltipState.isProgression,
            progressionPercentages: tooltipState.progressionPercentages,
          }
        : {
            visible: false,
            position: { x: 0, y: 0 },
            averageData: [],
            isProgression: false,
          },
    zoomLevel,
    isPanMode,
    handleHover,
    handleClick,
    handleZoomIn,
    handleZoomOut,
    handleReset,
    determineTrajectoryType,
  }
}
