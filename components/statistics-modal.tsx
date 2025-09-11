"use client"

import { useEffect, useRef } from "react"
import { X } from "lucide-react"
import ReactECharts from "echarts-for-react"
import type { JobtrekStatistics } from "@/lib/statistics-calculator"

interface StatisticsModalProps {
  statistics: JobtrekStatistics | null
  onClose: () => void
}

export function StatisticsModal({ statistics, onClose }: StatisticsModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Fermer le modal lorsque l'utilisateur clique en dehors
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    // Fermer le modal lorsque l'utilisateur appuie sur Échap
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose()
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    document.addEventListener("keydown", handleEscKey)

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("keydown", handleEscKey)
    }
  }, [onClose])

  if (!statistics) return null

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

  const lineChartOption = {
    animation: true,
    animationDuration: 2000,
    animationEasing: "cubicOut",
    animationDelay: 0,
    tooltip: {
      trigger: "item",
      backgroundColor: "#1f2937",
      borderColor: "#374151",
      borderWidth: 1,
      textStyle: {
        color: "#fff",
      },
      formatter: (params: any) => {
        const isAfter = params.dataIndex === 1
        const label = isAfter ? "Après mesure Jobtrek" : "Avant mesure Jobtrek"
        if (isAfter) {
          const improvement =
            ((statistics.simpleComparison.afterAvg - statistics.simpleComparison.beforeAvg) /
              statistics.simpleComparison.beforeAvg) *
            100
          const sign = improvement > 0 ? "+" : ""
          const improvementText = improvement >= 0 ? "d'amélioration" : "de baisse"
          return `${label}<br/>Score: ${params.value}<br/>${sign}${improvement.toFixed(1)}% ${improvementText}`
        }
        return `${label}<br/>Score: ${params.value}`
      },
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
      data: ["Avant Jobtrek", "Après Jobtrek"],
      axisLine: {
        lineStyle: {
          color: "#374151",
        },
      },
      axisTick: {
        lineStyle: {
          color: "#374151",
        },
      },
      axisLabel: {
        color: "#9ca3af",
        fontSize: 12,
        align: "center",
        margin: 15,
        interval: 0,
        rotate: 0,
      },
      boundaryGap: false,
    },
    yAxis: {
      type: "value",
      show: true,
      axisLine: {
        show: false,
      },
      axisTick: {
        show: false,
      },
      axisLabel: {
        show: false,
      },
      splitLine: {
        show: true,
        lineStyle: {
          color: "#374151",
          type: "solid",
          width: 1,
        },
      },
    },
    series: [
      {
        type: "line",
        data: [
          [0, statistics.simpleComparison.beforeAvg],
          [1, statistics.simpleComparison.afterAvg],
        ],
        animation: true,
        animationDuration: 2000,
        animationEasing: "cubicOut",
        lineStyle: {
          color: "#22c55e",
          width: 4,
        },
        itemStyle: {
          color: "#22c55e",
          borderColor: "#ffffff",
          borderWidth: 3,
        },
        symbol: "circle",
        symbolSize: 12,
        emphasis: {
          itemStyle: {
            borderColor: "#ffffff",
            borderWidth: 4,
            shadowBlur: 10,
            shadowColor: "#22c55e",
          },
          symbolSize: 16,
        },
        showSymbol: true,
      },
    ],
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      <div
        ref={modalRef}
        className="relative w-[80vw] max-w-4xl max-h-[80vh] overflow-auto bg-black/80 backdrop-blur-md border border-gray-800 rounded-xl shadow-2xl pointer-events-auto"
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
            onClick={() => onClose()}
            className="rounded-full p-2 text-gray-400 hover:text-white hover:bg-gray-800 transition-colors cursor-pointer"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6">
          {/* Grille 2x2 pour les 4 statistiques */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Section 1 : Impact Jobtrek */}
            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
              <div className="text-gray-400 text-sm mb-4">Impact Jobtrek</div>
              <div className="h-48">
                <ReactECharts
                  option={lineChartOption}
                  style={{ height: "100%", width: "100%" }}
                  opts={{ renderer: "svg" }}
                />
              </div>
            </div>

            {/* Section 2 : Pourcentage d'amélioration */}
            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
              <div className="text-gray-400 text-sm mb-4">Amélioration moyenne</div>
              <div className="h-48 flex flex-col items-center justify-center">
                <div
                  className={`text-4xl font-bold mb-2 ${
                    statistics.improvementPercentage >= 0 ? "text-green-400" : "text-red-400"
                  }`}
                >
                  {statistics.improvementPercentage > 0 ? "+" : ""}
                  {statistics.improvementPercentage.toFixed(1)}%
                </div>
                <div className="text-gray-300 text-center mb-4">
                  {statistics.improvementPercentage >= 0 ? "d'amélioration" : "de baisse"} moyenne après intervention
                  Jobtrek
                </div>

                <div className="text-gray-400 text-sm mb-2 font-medium text-left w-full">Parcours post-Jobtrek</div>
                <div className="flex items-center justify-center space-x-4">
                  <div className="text-center">
                    <div className="text-green-400 font-bold text-lg">
                      {statistics.progressionBreakdown.progressionPercentage}%
                    </div>
                    <div className="text-gray-400 text-xs">Progression</div>
                  </div>
                  <div className="w-px h-8 bg-gray-600"></div>
                  <div className="text-center">
                    <div className="text-yellow-400 font-bold text-lg">
                      {statistics.progressionBreakdown.stagnationPercentage}%
                    </div>
                    <div className="text-gray-400 text-xs">Stagnation</div>
                  </div>
                  <div className="w-px h-8 bg-gray-600"></div>
                  <div className="text-center">
                    <div className="text-red-400 font-bold text-lg">
                      {statistics.progressionBreakdown.regressionPercentage}%
                    </div>
                    <div className="text-gray-400 text-xs">Régression</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 3 : Top 5 événements post-Jobtrek */}
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

            {/* Section 4 : Répartition des mesures */}
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
          </div>
        </div>
      </div>
    </div>
  )
}
