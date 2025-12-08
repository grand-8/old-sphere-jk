"use client"

import { useEffect, useRef, useState } from "react"
import { X } from "lucide-react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts"
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
  }, [isMobile])

  if (!statistics) return null

  const mistJobtrekData = [
    { name: "Avant", value: statistics?.impactCharts.mistJobtrek.startAvg || 0 },
    { name: "Jobtrek", value: statistics?.impactCharts.mistJobtrek.jobtrekAvg || 0 },
    { name: "Après", value: statistics?.impactCharts.mistJobtrek.finalAvg || 0 },
  ]

  const jobtrekSchoolData = [
    { name: "Avant", value: statistics?.impactCharts.jobtrekSchool.startAvg || 0 },
    { name: "Jobtrek", value: statistics?.impactCharts.jobtrekSchool.jobtrekAvg || 0 },
    { name: "Après", value: statistics?.impactCharts.jobtrekSchool.finalAvg || 0 },
  ]

  const pieData = [
    {
      name: "MISt Jobtrek",
      value: statistics.measureDistribution.mistJobtrek,
      color: "#22c55e",
    },
    {
      name: "JobtrekSchool",
      value: statistics.measureDistribution.jobtrekSchool,
      color: "#3b82f6",
    },
  ]

  const CustomTooltip = ({ active, payload, label, chartType }: any) => {
    if (active && payload && payload.length) {
      const value = payload[0].value
      const dataIndex =
        chartType === "mist"
          ? mistJobtrekData.findIndex((d) => d.name === label)
          : jobtrekSchoolData.findIndex((d) => d.name === label)
      const jobtrekValue =
        chartType === "mist"
          ? statistics?.impactCharts.mistJobtrek.jobtrekAvg
          : statistics?.impactCharts.jobtrekSchool.jobtrekAvg

      let tooltipText = ""
      if (dataIndex === 0) {
        tooltipText = `Avant la mesure: ${value.toFixed(2)}`
      } else if (dataIndex === 1) {
        tooltipText = `Début Jobtrek: ${value.toFixed(2)}`
      } else {
        const progression = jobtrekValue !== 0 ? ((value - jobtrekValue) / Math.abs(jobtrekValue)) * 100 : 0
        const sign = progression > 0 ? "+" : ""
        tooltipText = `Impact final: ${value.toFixed(2)} (${sign}${progression.toFixed(1)}% depuis Jobtrek)`
      }

      return (
        <div className="bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white text-sm">{tooltipText}</div>
      )
    }
    return null
  }

  const PieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const total = statistics.measureDistribution.mistJobtrek + statistics.measureDistribution.jobtrekSchool
      const percentage = ((payload[0].value / total) * 100).toFixed(1)
      return (
        <div className="bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white text-sm">
          {payload[0].name}: {percentage}%
        </div>
      )
    }
    return null
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
            <div className="text-gray-400 text-sm mb-4">Impact Jobtrek par type de mesure</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* MISt Jobtrek Chart */}
              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                <div className="flex items-center space-x-2 mb-3">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <div className="text-white text-sm font-medium">MISt Jobtrek</div>
                </div>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={mistJobtrekData} margin={{ top: 10, right: 30, left: 0, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis
                        dataKey="name"
                        tick={{ fill: "#9ca3af", fontSize: 11 }}
                        axisLine={{ stroke: "#374151" }}
                        tickLine={{ stroke: "#374151" }}
                      />
                      <YAxis hide />
                      <Tooltip content={<CustomTooltip chartType="mist" />} />
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke="#22c55e"
                        strokeWidth={3}
                        dot={{ fill: "#22c55e", stroke: "#ffffff", strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6, fill: "#22c55e", stroke: "#ffffff", strokeWidth: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* JobtrekSchool Chart */}
              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                <div className="flex items-center space-x-2 mb-3">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <div className="text-white text-sm font-medium">JobtrekSchool</div>
                </div>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={jobtrekSchoolData} margin={{ top: 10, right: 30, left: 0, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis
                        dataKey="name"
                        tick={{ fill: "#9ca3af", fontSize: 11 }}
                        axisLine={{ stroke: "#374151" }}
                        tickLine={{ stroke: "#374151" }}
                      />
                      <YAxis hide />
                      <Tooltip content={<CustomTooltip chartType="school" />} />
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke="#3b82f6"
                        strokeWidth={3}
                        dot={{ fill: "#3b82f6", stroke: "#ffffff", strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6, fill: "#3b82f6", stroke: "#ffffff", strokeWidth: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Section 3 : Répartition des mesures */}
            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
              <div className="text-gray-400 text-sm mb-4">Répartition des mesures</div>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="45%"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<PieTooltip />} />
                    <Legend
                      verticalAlign="bottom"
                      height={36}
                      formatter={(value) => <span className="text-gray-300 text-sm">{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
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
