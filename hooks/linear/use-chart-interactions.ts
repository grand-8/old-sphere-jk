"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import type { ChartJS } from "chart.js"
import type { LifeTrajectory } from "@/lib/data-service"
import { findClosestTrajectoryToMouse } from "@/utils/linear/chart-calculations"
import { useLifeTrajectoryStore } from "@/lib/store"
import { calculateIndividualImprovement } from "@/lib/statistics-calculator"
import { calculateJobtrekToFinalProgression } from "@/utils/linear/chart-data-transform"

interface TooltipState {
  visible: boolean
  position: { x: number; y: number }
  trajectory: LifeTrajectory | null
}

interface AverageTooltipState {
  visible: boolean
  position: { x: number; y: number }
  averageData: (number | null)[]
  isProgression: boolean
  progressionPercentages?: { beforeToJobtrek: number; jobtrekToFinal: number }
}

export function useChartInteractions(trajectories: LifeTrajectory[], chartData: any) {
  const chartRef = useRef<ChartJS<"line"> | null>(null)
  const [hoveredTrajectory, setHoveredTrajectory] = useState<string | null>(null)
  const [isHoveringLine, setIsHoveringLine] = useState(false)
  const [currentHoveredTrajectoryId, setCurrentHoveredTrajectoryId] = useState<string | null>(null)
  const [tooltipState, setTooltipState] = useState<TooltipState>({
    visible: false,
    position: { x: 0, y: 0 },
    trajectory: null,
  })
  const [averageTooltipState, setAverageTooltipState] = useState<AverageTooltipState>({
    visible: false,
    position: { x: 0, y: 0 },
    averageData: [],
    isProgression: false,
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

      console.log("[v0] SPACEBAR_DOWN_START - Event triggered")
      console.log("[v0] SPACEBAR_DOWN_CHART_STATE - Chart exists:", !!chart)
      console.log("[v0] SPACEBAR_DOWN_ZOOM_STATE - isZoomedOrPanned:", chart.isZoomedOrPanned?.() || false)

      if (chart.scales?.x && chart.scales?.y) {
        console.log("[v0] SPACEBAR_DOWN_SCALES_BEFORE:")
        console.log(
          "  - X Scale - min:",
          chart.scales.x.min,
          "max:",
          chart.scales.x.max,
          "start:",
          chart.scales.x.start,
          "end:",
          chart.scales.x.end,
        )
        console.log(
          "  - Y Scale - min:",
          chart.scales.y.min,
          "max:",
          chart.scales.y.max,
          "start:",
          chart.scales.y.start,
          "end:",
          chart.scales.y.end,
        )
      }

      setIsPanMode(true)
      console.log("[v0] SPACEBAR_DOWN_STATE - Set isPanMode to true")

      if (chart.options.plugins?.zoom?.pan) {
        console.log("[v0] SPACEBAR_DOWN_PAN_BEFORE - Pan enabled:", chart.options.plugins.zoom.pan.enabled)
        chart.options.plugins.zoom.pan.enabled = true
        console.log("[v0] SPACEBAR_DOWN_PAN_AFTER - Pan enabled:", chart.options.plugins.zoom.pan.enabled)
        chart.canvas.style.cursor = "grab"
        console.log("[v0] SPACEBAR_DOWN_CURSOR - Set cursor to grab")
      }

      console.log("[v0] SPACEBAR_DOWN_END - Spacebar press handling complete")
    }
  }, [])

  const handleKeyUp = useCallback(
    (event: KeyboardEvent) => {
      if (event.code === "Space" && chartRef.current) {
        const chart = chartRef.current

        console.log("[v0] SPACEBAR_UP_START - Event triggered")
        console.log("[v0] SPACEBAR_UP_CHART_STATE - Chart exists:", !!chart)
        console.log("[v0] SPACEBAR_UP_ZOOM_STATE_BEFORE - isZoomedOrPanned:", chart.isZoomedOrPanned?.() || false)

        if (chart.scales?.x && chart.scales?.y) {
          console.log("[v0] SPACEBAR_UP_SCALES_BEFORE:")
          console.log(
            "  - X Scale - min:",
            chart.scales.x.min,
            "max:",
            chart.scales.x.max,
            "start:",
            chart.scales.x.start,
            "end:",
            chart.scales.x.end,
          )
          console.log(
            "  - Y Scale - min:",
            chart.scales.y.min,
            "max:",
            chart.scales.y.max,
            "start:",
            chart.scales.y.start,
            "end:",
            chart.scales.y.end,
          )
        }

        setIsPanMode(false)
        console.log("[v0] SPACEBAR_UP_STATE - Set isPanMode to false")

        if (chart.options.plugins?.zoom?.pan) {
          console.log("[v0] SPACEBAR_UP_PAN_BEFORE - Pan enabled:", chart.options.plugins.zoom.pan.enabled)
          console.log("[v0] SPACEBAR_UP_HOVER_STATE - isHoveringLine:", isHoveringLine)
          chart.options.plugins.zoom.pan.enabled = !isHoveringLine
          console.log("[v0] SPACEBAR_UP_PAN_AFTER - Pan enabled:", chart.options.plugins.zoom.pan.enabled)
          chart.canvas.style.cursor = "default"
          console.log("[v0] SPACEBAR_UP_CURSOR - Set cursor to default")
        }

        console.log("[v0] SPACEBAR_UP_NO_UPDATE - Skipping chart.update() to preserve zoom state")

        if (chart.scales?.x && chart.scales?.y) {
          console.log("[v0] SPACEBAR_UP_SCALES_FINAL:")
          console.log(
            "  - X Scale - min:",
            chart.scales.x.min,
            "max:",
            chart.scales.x.max,
            "start:",
            chart.scales.x.start,
            "end:",
            chart.scales.x.end,
          )
          console.log(
            "  - Y Scale - min:",
            chart.scales.y.min,
            "max:",
            chart.scales.y.max,
            "start:",
            chart.scales.y.start,
            "end:",
            chart.scales.y.end,
          )
        }

        console.log("[v0] SPACEBAR_UP_END - Spacebar release handling complete")
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

    // Same priority logic as modal: MISt takes precedence over School
    if (hasMist) {
      return "Mesure MISt Jobtrek"
    } else if (hasSchool) {
      return "JobtrekSchool"
    }

    // Fallback to original typeMesure if no specific events found
    return trajectory.typeMesure || "JobtrekSchool"
  }, [])

  const handleHover = useCallback(
    (event: any, activeElements: any, chart: ChartJS<"line">) => {
      if (!chart || !event.native) return

      if (isPanMode) {
        return
      }

      const rect = chart.canvas.getBoundingClientRect()
      const mouseX = (event.native as MouseEvent).clientX - rect.left
      const mouseY = (event.native as MouseEvent).clientY - rect.top
      const clientX = (event.native as MouseEvent).clientX
      const clientY = (event.native as MouseEvent).clientY

      const closestTrajectoryId = findClosestTrajectoryToMouse(chart, mouseX, mouseY, 30)

      if (closestTrajectoryId === "progression") {
        const progressionDataset = chartData.datasets.find(
          (dataset: any) => dataset.trajectoryId === "progression",
        ) as any

        const progressionDatasetIndex = chartData.datasets.findIndex(
          (dataset: any) => dataset.trajectoryId === "progression",
        )

        if (progressionDatasetIndex !== -1) {
          chart.setActiveElements([{ datasetIndex: progressionDatasetIndex, index: 0 }])
          chart.update("none")
        }

        const jobtrekToFinalPercentage = calculateJobtrekToFinalProgression(trajectories)

        const tooltipData = {
          visible: true,
          position: { x: clientX, y: clientY },
          averageData: progressionDataset?.progressionData || [],
          isProgression: true,
          progressionPercentages: {
            beforeToJobtrek: 0,
            jobtrekToFinal: jobtrekToFinalPercentage,
          },
        }

        setCurrentHoveredTrajectoryId("progression")
        setTooltipState({ visible: false, position: { x: 0, y: 0 }, trajectory: null })
        setAverageTooltipState(tooltipData)
        setHoveredTrajectory("progression")
        setIsHoveringLine(true)
        if (event.native?.target) {
          ;(event.native.target as HTMLElement).style.cursor = "pointer"
        }
      } else if (closestTrajectoryId === "average") {
        const averageDataset = chartData.datasets.find((dataset: any) => dataset.trajectoryId === "average") as any

        const averageDatasetIndex = chartData.datasets.findIndex((dataset: any) => dataset.trajectoryId === "average")

        if (averageDatasetIndex !== -1) {
          chart.setActiveElements([{ datasetIndex: averageDatasetIndex, index: 0 }])
          chart.update("none")
        }

        const tooltipData = {
          visible: true,
          position: { x: clientX, y: clientY },
          averageData: averageDataset?.averageData || [],
          isProgression: false,
        }

        setCurrentHoveredTrajectoryId("average")
        setTooltipState({ visible: false, position: { x: 0, y: 0 }, trajectory: null })
        setAverageTooltipState(tooltipData)
        setHoveredTrajectory("average")
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
          chart.setActiveElements([{ datasetIndex: trajectoryDatasetIndex, index: 0 }])
          chart.update("none")
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

          setCurrentHoveredTrajectoryId(closestTrajectoryId)
          setTooltipState({
            visible: true,
            position: { x: clientX, y: clientY },
            trajectory: enhancedTrajectoryData,
          })
        } else {
          setCurrentHoveredTrajectoryId(closestTrajectoryId)
          setTooltipState({
            visible: true,
            position: { x: clientX, y: clientY },
            trajectory: trajectoryData || null,
          })
        }

        setAverageTooltipState({ visible: false, position: { x: 0, y: 0 }, averageData: [], isProgression: false })
        setHoveredTrajectory(closestTrajectoryId)
        setIsHoveringLine(true)
        if (event.native?.target) {
          ;(event.native.target as HTMLElement).style.cursor = "pointer"
        }
      } else {
        chart.setActiveElements([])
        chart.update("none")

        setCurrentHoveredTrajectoryId(null)
        setTooltipState({ visible: false, position: { x: 0, y: 0 }, trajectory: null })
        setAverageTooltipState({ visible: false, position: { x: 0, y: 0 }, averageData: [], isProgression: false })
        setHoveredTrajectory(null)
        setIsHoveringLine(false)
        if (event.native?.target) {
          ;(event.native.target as HTMLElement).style.cursor = "default"
        }
      }
    },
    [isPanMode, chartData, trajectories, determineTrajectoryType],
  )

  const handleClick = useCallback(
    (event: any, activeElements: any) => {
      if (currentHoveredTrajectoryId) {
        const originalTrajectory = trajectories.find((t) => t.id === currentHoveredTrajectoryId)

        if (originalTrajectory) {
          setSelectedPerson(originalTrajectory)
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
            }
          }
        }
      }
    },
    [currentHoveredTrajectoryId, trajectories, chartData, setSelectedPerson],
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
        // Fallback: manually reset zoom by updating chart options
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
  }
}
