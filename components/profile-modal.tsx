"use client"

import { useEffect, useRef, useState } from "react"
import { X } from "lucide-react"
import type { LifeTrajectory } from "@/lib/data-service"
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  type ChartOptions,
} from "chart.js"
import { Line } from "react-chartjs-2"
import { useMiniMountain } from "@/hooks/use-mini-mountain"
import { calculateIndividualImprovement } from "@/lib/statistics-calculator"

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend)

interface ProfileModalProps {
  trajectory: LifeTrajectory | null
  onClose: () => void
}

function calculatePeakStats(trajectory: LifeTrajectory) {
  if (!trajectory.points || trajectory.points.length === 0) {
    return {
      maxHeight: 0,
      avgHeight: 0,
      prominence: 0,
      dataPoints: 0,
    }
  }

  const scores = trajectory.points.map((p) => p.cumulativeScore)
  const maxScore = Math.max(...scores)
  const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length
  const minScore = Math.min(...scores)
  const prominence = maxScore - minScore

  return {
    maxHeight: maxScore,
    avgHeight: Math.round(avgScore * 10) / 10,
    prominence: Math.round(prominence * 10) / 10,
    dataPoints: trajectory.points.length,
  }
}

export function ProfileModal({ trajectory, onClose }: ProfileModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)
  const { canvasRef, isReady } = useMiniMountain(trajectory)
  const [isClosing, setIsClosing] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  const handleClose = () => {
    setIsClosing(true)
    if (isMobile) {
      setTimeout(() => {
        onClose()
      }, 200)
    } else {
      onClose()
    }
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        handleClose()
      }
    }

    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        handleClose()
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    document.addEventListener("keydown", handleEscKey)

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("keydown", handleEscKey)
    }
  }, [])

  if (!trajectory) return null

  const getCategoryColor = () => {
    switch (trajectory.category) {
      case "education":
        return "#3d6b7c" // Bleu-vert
      case "career":
        return "#4d8a7a" // Vert-bleu
      case "entrepreneurship":
        return "#22C55E" // Vert Jobtrek
      case "health":
        return "#2d4b6e" // Bleu moyen
      default:
        return "#4d8a7a" // Vert-bleu par défaut
    }
  }

  const isJobtrekEvent = (eventName: string) => {
    return eventName.includes("Mesure MISt Jobtrek") || eventName.includes("JobtrekSchool")
  }

  const getStepStatus = (point: any, index: number, allPoints: any[]) => {
    const isNotCompleted = point.termine === false || point.termine === "false"

    if (!isNotCompleted) {
      return null
    }

    const isLastStep = index === allPoints.length - 1

    if (isLastStep) {
      return { type: "en-cours", label: "En cours", color: "bg-orange-500" }
    } else {
      return { type: "non-termine", label: "Non terminé", color: "bg-red-500" }
    }
  }

  const formatChartData = () => {
    const yearCounts: { [key: number]: number } = {}

    const formattedData = trajectory.points.map((point) => {
      const year = point.year
      yearCounts[year] = (yearCounts[year] || 0) + 1
      const displayYear = yearCounts[year] === 1 ? year.toString() : `${year}.${yearCounts[year]}`

      return {
        x: displayYear,
        y: point.cumulativeScore,
        event: point.event,
        isJobtrek: isJobtrekEvent(point.event),
        originalYear: year,
      }
    })

    const jobtrekIndex = formattedData.findIndex((d) => d.isJobtrek)
    let postJobtrekColor = "#22C55E"

    if (jobtrekIndex !== -1 && jobtrekIndex < formattedData.length - 1) {
      const jobtrekScore = formattedData[jobtrekIndex].y
      const finalScore = formattedData[formattedData.length - 1].y

      if (finalScore > jobtrekScore) {
        postJobtrekColor = "#22C55E"
      } else if (finalScore < jobtrekScore) {
        postJobtrekColor = "#ea580c"
      }
    }

    const getPointColor = (index: number, isJobtrek: boolean) => {
      if (isJobtrek) return "#22C55E" // Jobtrek points stay green

      const stepStatus = getStepStatus(trajectory.points[index], index, trajectory.points)
      if (stepStatus) {
        if (stepStatus.type === "non-termine") return "#ef4444" // Red for incomplete steps
        if (stepStatus.type === "en-cours") return "#f97316" // Orange for last incomplete step
      }

      return "#ffffff" // White for completed steps
    }

    const getPointBorderColor = (index: number, isJobtrek: boolean) => {
      if (isJobtrek) return "#ffffff" // White border for Jobtrek points

      const stepStatus = getStepStatus(trajectory.points[index], index, trajectory.points)
      if (stepStatus) {
        if (stepStatus.type === "non-termine") return "#ef4444" // Red border for red points
        if (stepStatus.type === "en-cours") return "#f97316" // Orange border for orange points
      }

      return "#9ca3af" // Gray border for white points
    }

    const datasets = []

    if (jobtrekIndex !== -1 && jobtrekIndex < formattedData.length - 1) {
      datasets.push({
        data: formattedData.slice(0, jobtrekIndex + 1).map((d) => d.y),
        borderColor: "#ffffff",
        backgroundColor: "#ffffff",
        borderWidth: 3,
        pointBackgroundColor: formattedData.slice(0, jobtrekIndex + 1).map((d, i) => getPointColor(i, d.isJobtrek)),
        pointBorderColor: formattedData.slice(0, jobtrekIndex + 1).map((d, i) => getPointBorderColor(i, d.isJobtrek)),
        pointBorderWidth: 2,
        pointRadius: formattedData.slice(0, jobtrekIndex + 1).map((d) => (d.isJobtrek ? 6 : 4)),
        pointHoverRadius: 8,
        tension: 0,
        fill: false,
      })

      datasets.push({
        data: [
          ...Array(jobtrekIndex).fill(null),
          formattedData[jobtrekIndex].y,
          ...formattedData.slice(jobtrekIndex + 1).map((d) => d.y),
        ],
        borderColor: postJobtrekColor,
        backgroundColor: postJobtrekColor,
        borderWidth: 3,
        pointBackgroundColor: [
          ...Array(jobtrekIndex).fill("transparent"),
          "transparent",
          ...formattedData.slice(jobtrekIndex + 1).map((d, i) => getPointColor(jobtrekIndex + 1 + i, false)),
        ],
        pointBorderColor: [
          ...Array(jobtrekIndex).fill("transparent"),
          "transparent",
          ...formattedData.slice(jobtrekIndex + 1).map((d, i) => getPointBorderColor(jobtrekIndex + 1 + i, false)),
        ],
        pointBorderWidth: 2,
        pointRadius: [...Array(jobtrekIndex).fill(0), 0, ...formattedData.slice(jobtrekIndex + 1).map(() => 4)],
        pointHoverRadius: 8,
        tension: 0,
        fill: false,
      })
    } else {
      datasets.push({
        data: formattedData.map((d) => d.y),
        borderColor: "#22C55E",
        backgroundColor: "#22C55E",
        borderWidth: 3,
        pointBackgroundColor: formattedData.map((d, i) => getPointColor(i, d.isJobtrek)),
        pointBorderColor: formattedData.map((d, i) => getPointBorderColor(i, d.isJobtrek)),
        pointBorderWidth: 2,
        pointRadius: formattedData.map((d) => (d.isJobtrek ? 6 : 4)),
        pointHoverRadius: 8,
        tension: 0,
        fill: false,
      })
    }

    return {
      labels: formattedData.map((d) => d.x),
      datasets,
      rawData: formattedData,
    }
  }

  const chartData = formatChartData()

  const chartOptions: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: isClosing
      ? false
      : {
          duration: 750,
          easing: "easeInOutQuart",
        },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        enabled: !isClosing,
        backgroundColor: "rgba(17, 24, 39, 0.95)",
        titleColor: "#ffffff",
        bodyColor: "#e5e7eb",
        borderColor: "#374151",
        borderWidth: 1,
        cornerRadius: 8,
        padding: 12,
        displayColors: false,
        titleFont: {
          size: 16,
        },
        bodyFont: {
          size: 15,
        },
        filter: (tooltipItem) => {
          const datasetIndex = tooltipItem.datasetIndex
          const pointIndex = tooltipItem.dataIndex
          const datasets = tooltipItem.chart.data.datasets

          if (datasetIndex === 0) return true

          const firstDatasetValue = datasets[0].data[pointIndex]
          return firstDatasetValue === null || firstDatasetValue === undefined
        },
        callbacks: {
          title: (context) => {
            const index = context[0].dataIndex
            return chartData.rawData[index].x
          },
          label: (context) => {
            const index = context.dataIndex
            const data = chartData.rawData[index]
            const point = trajectory.points[index]

            console.log("[v0] Tooltip debug - Event:", data.event)
            console.log("[v0] Tooltip debug - Dataset index:", context.datasetIndex)
            console.log("[v0] Tooltip debug - Point index:", index)

            const lines = [data.event]

            const stepStatus = getStepStatus(point, index, trajectory.points)
            if (stepStatus) {
              if (stepStatus.type === "non-termine") {
                lines.push("🔴 Non terminé")
              } else if (stepStatus.type === "en-cours") {
                lines.push("🟠 En cours")
              }
            }

            const eventLower = data.event.toLowerCase()
            const shouldAddJobtrekLabel =
              data.isJobtrek && !eventLower.includes("jobtrek") && !eventLower.includes("mist jobtrek")

            if (shouldAddJobtrekLabel) {
              lines.push("🟢 Jobtrek")
            }

            console.log("[v0] Tooltip debug - Final lines:", lines)
            return lines
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          color: "#374151",
          drawBorder: false,
        },
        ticks: {
          color: "#9ca3af",
          font: {
            size: 12,
          },
        },
        border: {
          color: "#4b5563",
        },
      },
      y: {
        display: false,
        grid: {
          display: false,
        },
      },
    },
    interaction: {
      intersect: false,
      mode: "index",
    },
  }

  const numberOfSteps = trajectory.points.length

  const userCode = trajectory.userCode || `J${trajectory.id.substring(0, 3).toUpperCase()}`

  const measureName = trajectory.typeMesure || trajectory.category

  const individualImprovement = calculateIndividualImprovement(trajectory)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      <div
        ref={modalRef}
        className={`relative w-full h-full md:w-[80vw] md:max-w-xl md:max-h-[80vh] overflow-auto bg-black/80 backdrop-blur-md border border-gray-800 rounded-none md:rounded-xl shadow-2xl pointer-events-auto dark-scrollbar transition-opacity duration-200 ${
          isClosing && isMobile ? "opacity-0" : "opacity-100"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between p-6 border-b border-gray-800 bg-black/80 backdrop-blur-sm">
          <div>
            <h2 className="text-2xl font-bold text-white">{userCode}</h2>
          </div>
          <button
            onClick={handleClose}
            className="rounded-full p-2 text-gray-400 hover:text-white hover:bg-gray-800 transition-colors cursor-pointer"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700 flex flex-col justify-start items-center">
              <div className="text-gray-400 text-sm mb-2">Visualisation 3D</div>
              <div className="w-32 h-32 flex items-start justify-center">
                <canvas
                  ref={canvasRef}
                  className="w-full h-full rounded-lg"
                  style={{ maxWidth: "128px", maxHeight: "128px" }}
                />
              </div>
            </div>

            <div className="grid grid-rows-2 gap-4">
              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                <div className="text-gray-400 text-sm">Mesure</div>
                <div className="text-base font-bold text-white mt-1 capitalize">{measureName}</div>
              </div>

              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                <div className="text-gray-400 text-sm">Amélioration post-Jobtrek</div>
                <div
                  className={`text-base font-bold mt-1 ${
                    individualImprovement >= 0 ? "text-green-500" : "text-red-500"
                  }`}
                >
                  {individualImprovement >= 0 ? "+" : "-"}
                  {Math.abs(individualImprovement)}%
                </div>
              </div>
            </div>
          </div>

          <div className="mb-8">
            <h3 className="text-xl font-bold text-white mb-4">Évolution du parcours</h3>
            <div className="h-64 bg-gray-800/30 rounded-lg border border-gray-700 p-4">
              <Line data={chartData} options={chartOptions} />
            </div>
          </div>

          <div>
            <h3 className="text-xl font-bold text-white mb-4">Parcours professionnel</h3>
            <div className="space-y-4">
              {trajectory.points.map((point, index) => {
                const isJobtrek = isJobtrekEvent(point.event)
                const stepStatus = getStepStatus(point, index, trajectory.points)

                return (
                  <div
                    key={index}
                    className="flex items-start p-4 bg-gray-800/30 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors"
                  >
                    <div className="flex-shrink-0 mr-4 mt-1">
                      <div
                        className={`w-4 h-4 rounded-full border-2 ${
                          isJobtrek ? "bg-green-500 border-green-500" : "bg-white border-gray-400"
                        }`}
                      ></div>
                      {index < trajectory.points.length - 1 && (
                        <div className="w-0.5 h-8 bg-gray-600 ml-1.5 mt-2"></div>
                      )}
                    </div>
                    <div className="flex-grow">
                      <div className="mb-2 flex items-center gap-3">
                        <span className="text-lg font-bold text-blue-400">{point.year}</span>
                        {isJobtrek && (
                          <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                            Jobtrek
                          </span>
                        )}
                        {stepStatus && (
                          <span className={`${stepStatus.color} text-white text-xs px-2 py-1 rounded-full font-medium`}>
                            {stepStatus.label}
                          </span>
                        )}
                      </div>
                      <div className="mb-1">
                        <span className="font-bold text-white text-base">{point.event}</span>
                      </div>
                      <div className="text-sm text-gray-400">
                        {point.categorie && (
                          <span>
                            {point.categorie}
                            {point.sousCategorie && ` > ${point.sousCategorie}`}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
