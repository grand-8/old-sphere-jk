"use client"

import { useEffect, useRef } from "react"
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

export function ProfileModal({ trajectory, onClose }: ProfileModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)
  const { canvasRef, isReady } = useMiniMountain(trajectory)

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

  if (!trajectory) return null

  // Déterminer la couleur en fonction de la catégorie
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

  // Vérifier si un événement concerne Jobtrek
  const isJobtrekEvent = (eventName: string) => {
    return eventName.includes("Mesure MISt Jobtrek") || eventName.includes("JobtrekSchool")
  }

  const getStepStatus = (point: any, index: number, allPoints: any[]) => {
    // Vérifier si le champ "termine" existe et est explicitement "false"
    const isNotCompleted = point.termine === false || point.termine === "false"

    if (!isNotCompleted) {
      return null // Ne rien afficher si "true" ou "null"
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

    return {
      labels: formattedData.map((d) => d.x),
      datasets: [
        {
          data: formattedData.map((d) => d.y),
          borderColor: "#22C55E",
          backgroundColor: "#22C55E",
          borderWidth: 3,
          pointBackgroundColor: formattedData.map((d) => (d.isJobtrek ? "#22C55E" : "#ffffff")),
          pointBorderColor: formattedData.map((d) => (d.isJobtrek ? "#ffffff" : "#9ca3af")),
          pointBorderWidth: 2,
          pointRadius: formattedData.map((d) => (d.isJobtrek ? 6 : 4)),
          pointHoverRadius: 8,
          tension: 0,
          fill: false,
        },
      ],
      rawData: formattedData,
    }
  }

  const chartData = formatChartData()

  const chartOptions: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: "rgba(17, 24, 39, 0.95)",
        titleColor: "#ffffff",
        bodyColor: "#e5e7eb",
        borderColor: "#374151",
        borderWidth: 1,
        cornerRadius: 8,
        padding: 12,
        displayColors: false,
        titleFont: {
          size: 16, // Augmenté de ~20% (base ~13px)
        },
        bodyFont: {
          size: 15, // Augmenté de ~20% (base ~12px)
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

            const lines = [data.event]

            // Ajouter le statut si applicable
            const stepStatus = getStepStatus(point, index, trajectory.points)
            if (stepStatus) {
              if (stepStatus.type === "non-termine") {
                lines.push("🔴 Non terminé")
              } else if (stepStatus.type === "en-cours") {
                lines.push("🟠 En cours")
              }
            }

            // Ajouter Jobtrek sur une ligne séparée
            if (data.isJobtrek) {
              lines.push("🟢 Jobtrek")
            }

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
        display: false, // Hide Y axis as requested
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

  // Calculer le nombre d'étapes (nombre de points)
  const numberOfSteps = trajectory.points.length

  // Générer un code utilisateur si pas disponible
  const userCode = trajectory.userCode || `J${trajectory.id.substring(0, 3).toUpperCase()}`

  // Obtenir le nom de la mesure (typeMesure ou catégorie par défaut)
  const measureName = trajectory.typeMesure || trajectory.category

  // Calculer l'amélioration individuelle post-Jobtrek
  const individualImprovement = calculateIndividualImprovement(trajectory)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      <div
        ref={modalRef}
        className="relative w-[80vw] max-w-xl max-h-[80vh] overflow-auto bg-black/80 backdrop-blur-md border border-gray-800 rounded-xl shadow-2xl pointer-events-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* En-tête */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-6 border-b border-gray-800 bg-black/80 backdrop-blur-sm">
          <div>
            <h2 className="text-2xl font-bold text-white">{userCode}</h2>
          </div>
          <button
            onClick={() => onClose()}
            className="rounded-full p-2 text-gray-400 hover:text-white hover:bg-gray-800 transition-colors cursor-pointer"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6">
          {/* Mini-montagne 3D et résumé */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Mini-montagne 3D */}
            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700 flex flex-col items-center justify-center">
              <div className="text-gray-400 text-sm mb-2">Visualisation 3D</div>
              <div className="w-32 h-32 flex items-center justify-center">
                <canvas
                  ref={canvasRef}
                  className="w-full h-full rounded-lg"
                  style={{ maxWidth: "128px", maxHeight: "128px" }}
                />
              </div>
            </div>

            {/* Colonne 2 : Mesure et Début mesure */}
            <div className="grid grid-rows-2 gap-4">
              {/* Mesure */}
              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                <div className="text-gray-400 text-sm">Mesure</div>
                <div className="text-base font-bold text-white mt-1 capitalize">{measureName}</div>
              </div>

              {/* Début mesure */}
              {/* Amélioration post-Jobtrek */}
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

          {/* Graphique */}
          <div className="mb-8">
            <h3 className="text-xl font-bold text-white mb-4">Évolution du parcours</h3>
            <div className="h-64 bg-gray-800/30 rounded-lg border border-gray-700 p-4">
              <Line data={chartData} options={chartOptions} />
            </div>
          </div>

          {/* Parcours professionnel */}
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
