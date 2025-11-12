"use client"

import type React from "react"
import { useState, useCallback, useMemo } from "react"
import { useLifeTrajectoryStore } from "@/lib/store"
import { LinearChart } from "@/components/linear/linear-chart"
import { ProfileModal } from "@/components/profile-modal"
import { StatisticsModal } from "@/components/statistics-modal"
import { UIControls } from "@/components/ui-controls"
import { AlertTriangle } from "lucide-react"
import { calculateJobtrekStatistics } from "@/lib/statistics-calculator"

export function LinearView() {
  const { trajectoryData, filteredTrajectories, isLoading, error, refreshData, selectedPerson, setSelectedPerson } =
    useLifeTrajectoryStore()

  const [showStatistics, setShowStatistics] = useState(false)

  const handleUIEvent = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
  }, [])

  const handleRefresh = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      refreshData()
    },
    [refreshData],
  )

  const handleCloseProfile = useCallback(() => {
    setSelectedPerson(null)
    if (typeof window !== "undefined") {
      window.history.pushState({}, "", "/")
    }
  }, [setSelectedPerson])

  const handleOpenStatistics = useCallback(() => {
    setShowStatistics(true)
  }, [])

  const handleCloseStatistics = useCallback(() => {
    setShowStatistics(false)
  }, [])

  const statistics = useMemo(() => {
    if (!showStatistics) return null
    return calculateJobtrekStatistics(trajectoryData)
  }, [showStatistics, trajectoryData])

  const displayTrajectories = useMemo(() => {
    return filteredTrajectories.length > 0 ? filteredTrajectories : trajectoryData
  }, [filteredTrajectories, trajectoryData])

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-black text-white">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-t-white border-r-white border-b-transparent border-l-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p>Chargement des données...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-black text-white">
        <div className="text-center">
          <p className="text-red-400 mb-2">Erreur de chargement</p>
          <p className="text-sm text-gray-400">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-screen relative bg-black">
      <UIControls
        handleUIEvent={handleUIEvent}
        handleRefresh={handleRefresh}
        isZoomedIn={false}
        isLoading={isLoading}
        setControlsEnabled={() => {}}
        performZoom={() => {}}
        onStatisticsClick={handleOpenStatistics}
      />

      {displayTrajectories.length === 0 && (
        <div
          className="absolute top-20 left-1/2 transform -translate-x-1/2 bg-black/70 backdrop-blur-sm text-white px-4 py-2 rounded-lg flex items-center gap-2 z-50 pointer-events-none"
          style={{ maxWidth: "90vw" }}
        >
          <AlertTriangle size={16} className="text-yellow-400" />
          <span className="text-sm">Aucune trajectoire à afficher</span>
        </div>
      )}

      <div className="w-full h-full pt-16 pb-4 px-4">
        {displayTrajectories.length > 0 ? (
          <LinearChart trajectories={displayTrajectories} />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-4">Vue Graphique Linéaire</h2>
              <p className="text-gray-400">Aucune trajectoire disponible</p>
            </div>
          </div>
        )}
      </div>

      {selectedPerson && (
        <ProfileModal
          trajectory={selectedPerson}
          onClose={handleCloseProfile}
          onClick={handleUIEvent}
          onMouseDown={handleUIEvent}
          onMouseMove={handleUIEvent}
        />
      )}

      {showStatistics && <StatisticsModal statistics={statistics} onClose={handleCloseStatistics} />}
    </div>
  )
}
