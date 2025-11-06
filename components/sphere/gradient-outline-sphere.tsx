"use client"

import type React from "react"
import { useRef, useEffect, useCallback, useState } from "react"
import { ProfileModal } from "@/components/profile-modal"
import { StatisticsModal } from "@/components/statistics-modal"
import { AlertTriangle } from "lucide-react"
import { useLifeTrajectoryStore } from "@/lib/store"
import { UIControls } from "@/components/ui-controls"
import { useThreeScene } from "@/hooks/sphere/use-three-scene"
import { useMountainGeneration } from "@/hooks/sphere/use-mountain-generation"
import { useMouseEvents } from "@/hooks/sphere/use-mouse-events"
import { useInteractionManager } from "@/hooks/sphere/use-interaction-manager"
import { calculateJobtrekStatistics } from "@/lib/statistics-calculator"
import type { LifeTrajectory } from "@/lib/types"

/**
 * Composant principal de visualisation de la sphère avec les trajectoires de vie
 * Intègre les hooks personnalisés pour la gestion des interactions et de l'état
 */
export default function GradientOutlineSphere() {
  const containerRef = useRef<HTMLDivElement>(null)
  const tooltipRef = useRef<HTMLDivElement | null>(null)

  // État pour la modal de statistiques
  const [showStatistics, setShowStatistics] = useState(false)
  const [hasPlayedIntroAnimation, setHasPlayedIntroAnimation] = useState(false)

  const [selectedTrajectory, setSelectedTrajectory] = useState<LifeTrajectory | null>(null)
  const [controlsEnabled, setControlsEnabled] = useState(true)
  const [isZoomedIn, setIsZoomedIn] = useState(false)
  const [isMoving, setIsMoving] = useState(false)
  const [lastMoveTime, setLastMoveTime] = useState(Date.now() - 1000)
  const [isUpdatingMountains, setIsUpdatingMountains] = useState(false)
  const [filterError, setFilterError] = useState<string | null>(null)
  const [isFilterActive, setIsFilterActive] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  // Références simples
  const lastFilteredCountRef = useRef<number>(0)
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const moveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // État du store global
  const {
    filteredTrajectories,
    trajectoryData,
    searchQuery,
    isDirectCodeSearch,
    isLoading,
    error,
    refreshData,
    isIntroAnimationPlaying,
    setIsIntroAnimationPlaying,
    selectedPerson,
    setSelectedPerson,
  } = useLifeTrajectoryStore()

  useEffect(() => {
    console.log("[v0] Store selectedPerson changed:", selectedPerson?.userCode || null)
    if (selectedPerson && selectedPerson !== selectedTrajectory) {
      console.log("[v0] Syncing local selectedTrajectory with store selectedPerson")
      setSelectedTrajectory(selectedPerson)
    } else if (!selectedPerson && selectedTrajectory) {
      console.log("[v0] Clearing local selectedTrajectory")
      setSelectedTrajectory(null)
    }
  }, [selectedPerson, selectedTrajectory])

  // Hooks de gestion de la scène 3D
  const threeScene = useThreeScene(containerRef)
  const { sceneRef, cameraRef, controlsRef, sphereGroupRef, isRendering, controlsInitialized } = threeScene

  // Hook de génération des montagnes
  const mountainGeneration = useMountainGeneration(sphereGroupRef, isRendering, setIsUpdatingMountains, setFilterError)
  const { updateMountains } = mountainGeneration

  // Hook de gestion des événements souris
  const mouseEvents = useMouseEvents(
    tooltipRef,
    sceneRef,
    cameraRef,
    controlsEnabled,
    selectedTrajectory,
    isMoving,
    setLastMoveTime,
  )
  const { resetHighlight } = mouseEvents

  const handleSetSelectedTrajectory = useCallback(
    (trajectory: LifeTrajectory | null) => {
      console.log("[v0] handleSetSelectedTrajectory called with:", trajectory?.userCode || null)
      setSelectedTrajectory(trajectory)
      setSelectedPerson(trajectory)

      if (typeof window !== "undefined") {
        if (trajectory) {
          window.history.pushState({}, "", `/?trajectory=${trajectory.userCode}`)
        } else {
          window.history.pushState({}, "", "/")
        }
      }
    },
    [setSelectedPerson],
  )

  // Hook de gestion des interactions
  const interactionManager = useInteractionManager(
    {
      selectedTrajectory,
      setSelectedTrajectory: handleSetSelectedTrajectory,
      controlsEnabled,
      setControlsEnabled,
      isZoomedIn,
      setIsZoomedIn,
      isMoving,
      setIsMoving,
      lastMoveTime,
      setLastMoveTime,
      isIntroAnimationPlaying,
      setIsIntroAnimationPlaying,
      isUpdatingMountains,
      setIsUpdatingMountains,
      filterError,
      setFilterError,
      isFilterActive,
      setIsFilterActive,
      lastFilteredCountRef,
      updateTimeoutRef,
      moveTimeoutRef,
    },
    threeScene,
    mouseEvents,
  )
  const { performZoom, performIntroAnimation, handleCloseProfile, setupEventListeners } = interactionManager

  useEffect(() => {
    // Only trigger intro animation once per session and when data has loaded
    if (!isLoading && !hasPlayedIntroAnimation && trajectoryData.length > 0 && controlsInitialized) {
      setHasPlayedIntroAnimation(true)

      // Small delay to ensure everything is properly initialized
      setTimeout(() => {
        performIntroAnimation()
      }, 500)
    }
  }, [isLoading, hasPlayedIntroAnimation, trajectoryData.length, controlsInitialized, performIntroAnimation])

  // État pour la modal de profil
  const [showProfile, setShowProfile] = useState(false)

  // Gestionnaires d'événements UI
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

  // Gestionnaire pour fermer la modal de statistiques
  const handleCloseStatistics = useCallback(() => {
    if (isMobile) {
      // On mobile: close modal first, then zoom out
      setShowStatistics(false)
      setTimeout(() => {
        setControlsEnabled(false)
        performZoom(false, () => {
          setControlsEnabled(true)
        })
      }, 200) // Wait for modal fade out
    } else {
      // On desktop: zoom out with modal closing
      setShowStatistics(false)
      setControlsEnabled(false)
      performZoom(false, () => {
        setControlsEnabled(true)
      })
    }
  }, [performZoom, setControlsEnabled, isMobile])

  const handleOpenStatistics = useCallback(() => {
    setControlsEnabled(false)
    performZoom(true, () => {
      setShowStatistics(true)
      setControlsEnabled(true)
    })
  }, [performZoom, setControlsEnabled])

  // Calcul des statistiques
  const statistics = showStatistics ? calculateJobtrekStatistics(trajectoryData) : null

  // Mise à jour des montagnes lors du filtrage
  useEffect(() => {
    // Éviter les mises à jour inutiles
    if (
      lastFilteredCountRef.current === filteredTrajectories.length &&
      !isFilterActive &&
      filteredTrajectories.length === 0
    ) {
      return
    }

    // Déterminer si le filtrage est actif
    const newIsFilterActive = searchQuery.trim().length > 0
    setIsFilterActive(newIsFilterActive)

    // Debounce pour éviter trop de mises à jour rapides
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current)
    }

    updateTimeoutRef.current = setTimeout(() => {
      updateMountains(filteredTrajectories, isDirectCodeSearch)
      lastFilteredCountRef.current = filteredTrajectories.length
    }, 300)

    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current)
      }
    }
  }, [filteredTrajectories, searchQuery, isDirectCodeSearch, updateMountains, isFilterActive, setIsFilterActive])

  // Configuration des contrôles OrbitControls
  useEffect(() => {
    if (!controlsInitialized || !controlsRef.current) return

    const controls = controlsRef.current

    const handleControlsStart = () => {
      setIsMoving(true)
      if (moveTimeoutRef.current) {
        clearTimeout(moveTimeoutRef.current)
      }
    }

    const handleControlsEnd = () => {
      if (moveTimeoutRef.current) {
        clearTimeout(moveTimeoutRef.current)
      }

      moveTimeoutRef.current = setTimeout(() => {
        if (!mouseEvents.isDraggingRef.current) {
          setLastMoveTime(Date.now())
          setIsMoving(false)
        }
      }, 200)
    }

    controls.addEventListener("start", handleControlsStart)
    controls.addEventListener("end", handleControlsEnd)

    return () => {
      controls.removeEventListener("start", handleControlsStart)
      controls.removeEventListener("end", handleControlsEnd)
    }
  }, [controlsInitialized, setIsMoving, setLastMoveTime, mouseEvents.isDraggingRef])

  // Configuration des écouteurs d'événements
  useEffect(() => {
    return setupEventListeners()
  }, [setupEventListeners])

  // Réinitialisation du surlignage lors de la sélection d'une trajectoire
  useEffect(() => {
    if (selectedTrajectory) {
      resetHighlight()
      document.body.style.cursor = "auto"
    }
  }, [selectedTrajectory, resetHighlight])

  // Création du tooltip une seule fois
  useEffect(() => {
    if (!containerRef.current || tooltipRef.current) return

    const tooltip = document.createElement("div")
    tooltip.className = "absolute hidden bg-black/80 text-white p-2 rounded-md text-sm z-50 pointer-events-none"
    tooltip.style.border = "1px solid rgba(255, 255, 255, 0.2)"
    tooltip.style.boxShadow = "0 4px 6px rgba(0, 0, 0, 0.1)"
    tooltip.style.minWidth = "150px"
    containerRef.current.appendChild(tooltip)
    tooltipRef.current = tooltip

    return () => {
      if (containerRef.current && tooltipRef.current) {
        try {
          containerRef.current.removeChild(tooltipRef.current)
          tooltipRef.current = null
        } catch (error) {
          console.warn("Erreur suppression tooltip:", error)
        }
      }
    }
  }, [])

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  return (
    <div ref={containerRef} className="w-full h-screen relative" data-three-container="true">
      <UIControls
        handleUIEvent={handleUIEvent}
        handleRefresh={handleRefresh}
        isZoomedIn={isZoomedIn}
        isLoading={isLoading}
        setControlsEnabled={setControlsEnabled}
        performZoom={performZoom}
        onStatisticsClick={handleOpenStatistics}
        isIntroAnimationPlaying={isIntroAnimationPlaying}
      />

      {/* Message d'erreur de filtrage */}
      {filterError && (
        <div
          className="absolute top-20 left-1/2 transform -translate-x-1/2 bg-black/70 backdrop-blur-sm text-white px-4 py-2 rounded-lg flex items-center gap-2 z-50 pointer-events-none"
          style={{ maxWidth: "90vw" }}
        >
          <AlertTriangle size={16} className="text-yellow-400" />
          <span className="text-sm">{filterError}</span>
        </div>
      )}

      {/* Message d'erreur de chargement */}
      {error && (
        <div
          className="absolute top-20 left-1/2 transform -translate-x-1/2 bg-red-900/70 backdrop-blur-sm text-white px-4 py-2 rounded-lg flex items-center gap-2 z-50 pointer-events-none"
          style={{ maxWidth: "90vw" }}
        >
          <AlertTriangle size={16} className="text-red-400" />
          <span className="text-sm">Erreur: {error}</span>
        </div>
      )}

      {/* Indicateur de chargement pendant la mise à jour des montagnes */}
      {(isUpdatingMountains || isLoading) && (
        <div className="absolute inset-0 flex items-center justify-center z-40 pointer-events-none">
          <div className="bg-black/70 backdrop-blur-sm rounded-lg p-4 flex items-center space-x-3">
            <div className="w-5 h-5 border-2 border-t-white border-r-white border-b-transparent border-l-transparent rounded-full animate-spin"></div>
            <span className="text-white text-sm">
              {isLoading ? "Chargement depuis l'API..." : "Mise à jour en cours..."}
            </span>
          </div>
        </div>
      )}

      {selectedTrajectory && (
        <ProfileModal
          trajectory={selectedTrajectory}
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
