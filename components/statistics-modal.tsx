"use client"

import { useEffect, useRef, useState } from "react"
import { X } from "lucide-react"
import ReactECharts from "echarts-for-react"
import type { JobtrekStatistics } from "@/lib/statistics-calculator"

interface StatisticsModalProps {
  statistics: JobtrekStatistics | null
  onClose: () => void
}

export function StatisticsModal({ statistics, onClose }: StatisticsModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)
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
      }, 200) // Quick fade out on mobile
    } else {
      onClose()
    }
  }

  useEffect(() => {
    // Fermer le modal lorsque l'utilisateur clique en dehors
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        handleClose()
      }
    }

    // Fermer le modal lorsque l'utilisateur appuie sur Échap
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
  }, [isMobile])

  if (!statistics) return null

  const combinedImpactChartOption = {
    animation: true,
    animationDuration: 2000,
    animationEasing: "cubicOut",
    tooltip: {
      trigger: "item",
      backgroundColor: "#1f2937",
      borderColor: "#374151",
      borderWidth: 1,
      textStyle: { color: "#fff" },
      formatter: (params: any) => {
        const labels = ["Avant la mesure", "Début Jobtrek", "Impact final"]
        const isMist = params.seriesName === "MIST Jobtrek"
        const measureName = isMist ? "MIST" : "Jobtrekschool"

        if (params.dataIndex === 0) {
          return `Avant la ${measureName} (${params.seriesName})`
        } else if (params.dataIndex === 1) {
          return `${labels[params.dataIndex]} (${params.seriesName})`
        } else {
          const jobtrekValue = isMist
            ? statistics?.impactCharts.mistJobtrek.jobtrekAvg
            : statistics?.impactCharts.jobtrekSchool.jobtrekAvg
          const progression = jobtrekValue !== 0 ? ((params.value - jobtrekValue) / jobtrekValue) * 100 : 0
          const sign = progression > 0 ? "+" : ""
          return `${labels[params.dataIndex]} (${params.seriesName})<br/>${sign}${progression.toFixed(1)}% depuis Jobtrek`
        }
      },
    },
    legend: {
      data: ["MIST Jobtrek", "Jobtrekschool"],
      bottom: "5%",
      left: "center",
      textStyle: { color: "#d1d5db", fontSize: 12 },
      itemWidth: 12,
      itemHeight: 12,
    },
    grid: {
      left: "10%",
      right: "10%",
      bottom: "20%",
      top: "15%",
      containLabel: true,
    },
    xAxis: {
      type: "category",
      data: ["Avant", "Jobtrek", "Après Jobtrek"],
      axisLine: { lineStyle: { color: "#374151" } },
      axisTick: { lineStyle: { color: "#374151" } },
      axisLabel: { color: "#9ca3af", fontSize: 12 },
    },
    yAxis: {
      type: "value",
      show: true,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { show: false },
      splitLine: {
        show: true,
        lineStyle: { color: "#374151", type: "solid", width: 1 },
      },
    },
    series: [
      {
        name: "MIST Jobtrek",
        type: "line",
        data: [
          statistics?.impactCharts.mistJobtrek.startAvg || 0,
          statistics?.impactCharts.mistJobtrek.jobtrekAvg || 0,
          statistics?.impactCharts.mistJobtrek.finalAvg || 0,
        ],
        lineStyle: { color: "#22c55e", width: 3 },
        itemStyle: { color: "#22c55e", borderColor: "#ffffff", borderWidth: 2 },
        symbol: "circle",
        symbolSize: 8,
        showSymbol: true,
      },
      {
        name: "Jobtrekschool",
        type: "line",
        data: [
          statistics?.impactCharts.jobtrekSchool.startAvg || 0,
          statistics?.impactCharts.jobtrekSchool.jobtrekAvg || 0,
          statistics?.impactCharts.jobtrekSchool.finalAvg || 0,
        ],
        lineStyle: { color: "#3b82f6", width: 3 },
        itemStyle: { color: "#3b82f6", borderColor: "#ffffff", borderWidth: 2 },
        symbol: "circle",
        symbolSize: 8,
        showSymbol: true,
      },
    ],
  }

  const pieChartOption = {
    tooltip: {
      trigger: "item",
      backgroundColor: "#1f2937",
      borderColor: "#374151",
      borderWidth: 1,
      textStyle: {
        color: "#fff",
      },
      formatter: "{b}: {d}%",
    },
    legend: {
      orient: "horizontal",
      bottom: "0%",
      left: "center",
      textStyle: {
        color: "#d1d5db",
        fontSize: 12,
      },
      itemWidth: 12,
      itemHeight: 12,
    },
    series: [
      {
        type: "pie",
        radius: ["40%", "70%"],
        center: ["50%", "45%"],
        avoidLabelOverlap: false,
        label: {
          show: false,
        },
        emphasis: {
          label: {
            show: false,
          },
        },
        labelLine: {
          show: false,
        },
        data: [
          {
            value: statistics.measureDistribution.mistJobtrek,
            name: `MISt Jobtrek (${((statistics.measureDistribution.mistJobtrek / (statistics.measureDistribution.mistJobtrek + statistics.measureDistribution.jobtrekSchool)) * 100).toFixed(1)}%)`,
            itemStyle: { color: "#22c55e" },
          },
          {
            value: statistics.measureDistribution.jobtrekSchool,
            name: `JobtrekSchool (${((statistics.measureDistribution.jobtrekSchool / (statistics.measureDistribution.mistJobtrek + statistics.measureDistribution.jobtrekSchool)) * 100).toFixed(1)}%)`,
            itemStyle: { color: "#3b82f6" },
          },
        ],
      },
    ],
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      <div
        ref={modalRef}
        className={`relative w-full h-full md:w-[80vw] md:max-w-4xl md:max-h-[80vh] overflow-auto bg-black/80 backdrop-blur-md border border-gray-800 rounded-none md:rounded-xl shadow-2xl pointer-events-auto dark-scrollbar transition-opacity duration-200 ${
          isClosing && isMobile ? "opacity-0" : "opacity-100"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* En-tête */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-6 border-b border-gray-800 bg-black/80 backdrop-blur-sm">
          <div>
            <h2 className="text-2xl font-bold text-white">Statistiques globales Jobtrek</h2>
            <div className="text-gray-400 text-sm mt-1">
              Analyse d'impact des parcours transmis - {statistics.measureDistribution.total} personnes
            </div>
          </div>
          <button
            onClick={handleClose}
            className="rounded-full p-2 text-gray-400 hover:text-white hover:bg-gray-800 transition-colors cursor-pointer"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6">
          {/* Grille 2x2 pour les 2 premières statistiques */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Section 2 : Amélioration moyenne */}
            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
              <div className="text-gray-400 text-sm mb-4">Amélioration moyenne</div>
              <div className="h-32 flex flex-col items-center justify-center">
                <div
                  className={`text-4xl font-bold mb-3 ${
                    statistics.improvementPercentage >= 0 ? "text-green-400" : "text-red-400"
                  }`}
                >
                  {statistics.improvementPercentage > 0 ? "+" : ""}
                  {statistics.improvementPercentage.toFixed(1)}%
                </div>
                <div className="text-gray-300 text-center mb-4">d'amélioration moyenne après intervention Jobtrek</div>
              </div>
            </div>

            {/* Section 1 : Parcours post-Jobtrek */}
            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
              <div className="text-gray-400 text-sm mb-4">Parcours post-Jobtrek</div>

              <div className="h-32 flex flex-col items-center justify-center">
                <div className="flex items-center justify-center space-x-4 mb-3">
                  <div className="text-center">
                    <div className="text-green-400 font-bold text-2xl">
                      {statistics.progressionBreakdown.progressionPercentage}%
                    </div>
                    <div className="text-gray-400 text-xs">Progression</div>
                  </div>
                  <div className="w-px h-8 bg-gray-600"></div>
                  <div className="text-center">
                    <div className="text-yellow-400 font-bold text-2xl">
                      {statistics.progressionBreakdown.stagnationPercentage}%
                    </div>
                    <div className="text-gray-400 text-xs">Stagnation</div>
                  </div>
                  <div className="w-px h-8 bg-gray-600"></div>
                  <div className="text-center">
                    <div className="text-red-400 font-bold text-2xl">
                      {statistics.progressionBreakdown.regressionPercentage}%
                    </div>
                    <div className="text-gray-400 text-xs">Régression</div>
                  </div>
                </div>
                <div className="text-gray-300 text-s text-center">Impact du parcours après intervention Jobtrek</div>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
              <div className="text-gray-400 text-sm mb-4">Impact Jobtrek par type de mesure</div>
              <div className="flex items-center space-x-4 mb-3">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <div className="text-white text-sm font-medium">MIST Jobtrek</div>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <div className="text-white text-sm font-medium">Jobtrekschool</div>
                </div>
              </div>
              <div className="h-48">
                <ReactECharts
                  option={combinedImpactChartOption}
                  style={{ height: "100%", width: "100%" }}
                  opts={{ renderer: "svg" }}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Section 3 : Répartition des mesures */}
            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
              <div className="text-gray-400 text-sm mb-4">Répartition des mesures</div>
              <div className="h-48">
                <ReactECharts
                  option={pieChartOption}
                  style={{ height: "100%", width: "100%" }}
                  opts={{ renderer: "svg" }}
                />
              </div>
            </div>

            {/* Section 4 : Top 5 événements post-Jobtrek */}
            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
              <div className="text-gray-400 text-sm mb-4">Top 5 étapes post-Jobtrek</div>
              <div className="h-48 flex flex-col justify-center space-y-3">
                {statistics.topPostJobtrekEvents.slice(0, 5).map((event, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-white text-sm font-bold">
                        {index + 1}
                      </div>
                      <div className="text-white text-sm truncate max-w-[200px]" title={event.event}>
                        {event.event}
                      </div>
                    </div>
                    <div className="text-green-400 font-semibold">{event.percentage.toFixed(1)}%</div>
                  </div>
                ))}
                {statistics.topPostJobtrekEvents.length === 0 && (
                  <div className="text-gray-500 text-center">Aucune donnée disponible</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
