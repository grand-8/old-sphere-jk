"use client"

import type React from "react"
import { useState, useRef } from "react"
import type { LifeTrajectory } from "@/lib/data-service"

export interface VisualizationState {
  // États principaux
  selectedTrajectory: LifeTrajectory | null
  setSelectedTrajectory: (trajectory: LifeTrajectory | null) => void
  controlsEnabled: boolean
  setControlsEnabled: (enabled: boolean) => void
  isZoomedIn: boolean
  setIsZoomedIn: (zoomed: boolean) => void
  isMoving: boolean
  setIsMoving: (moving: boolean) => void
  lastMoveTime: number
  setLastMoveTime: (time: number) => void

  isIntroAnimationPlaying: boolean
  setIsIntroAnimationPlaying: (playing: boolean) => void

  // États de chargement et erreurs
  isUpdatingMountains: boolean
  setIsUpdatingMountains: (updating: boolean) => void
  filterError: string | null
  setFilterError: (error: string | null) => void
  isFilterActive: boolean
  setIsFilterActive: (active: boolean) => void

  // Références
  lastFilteredCountRef: React.MutableRefObject<number>
  updateTimeoutRef: React.MutableRefObject<NodeJS.Timeout | null>
  moveTimeoutRef: React.MutableRefObject<NodeJS.Timeout | null>
}

/**
 * Hook de gestion centralisée de l'état de visualisation
 * Centralise tous les états locaux pour éviter la dispersion
 * @returns État et setters pour la visualisation 3D
 */
export function useVisualizationState(): VisualizationState {
  // États principaux
  const [selectedTrajectory, setSelectedTrajectory] = useState<LifeTrajectory | null>(null)
  const [controlsEnabled, setControlsEnabled] = useState(true)
  const [isZoomedIn, setIsZoomedIn] = useState(false)
  const [isMoving, setIsMoving] = useState(false)
  const [lastMoveTime, setLastMoveTime] = useState(Date.now() - 1000) // Initialiser dans le passé

  const [isIntroAnimationPlaying, setIsIntroAnimationPlaying] = useState(true)

  // États de chargement et erreurs
  const [isUpdatingMountains, setIsUpdatingMountains] = useState(false)
  const [filterError, setFilterError] = useState<string | null>(null)
  const [isFilterActive, setIsFilterActive] = useState(false)

  // Références
  const lastFilteredCountRef = useRef<number>(0)
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const moveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  return {
    // États principaux
    selectedTrajectory,
    setSelectedTrajectory,
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

    // États de chargement et erreurs
    isUpdatingMountains,
    setIsUpdatingMountains,
    filterError,
    setFilterError,
    isFilterActive,
    setIsFilterActive,

    // Références
    lastFilteredCountRef,
    updateTimeoutRef,
    moveTimeoutRef,
  }
}
