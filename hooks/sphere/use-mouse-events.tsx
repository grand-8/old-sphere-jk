"use client"

import type React from "react"
import { useRef, useCallback } from "react"
import * as THREE from "three"
import type { LifeTrajectory } from "@/lib/data-service"
import { calculateIndividualImprovement } from "@/lib/statistics-calculator"

// Couleurs pour les éléments visuels
const COLORS = {
  darkBlue: new THREE.Color("#1a2b4d"),
  mediumBlue: new THREE.Color("#2d4b6e"),
  tealBlue: new THREE.Color("#3d6b7c"),
  teal: new THREE.Color("#4d8a7a"),
  lightGreen: new THREE.Color("#7ab555"),
  highlight: new THREE.Color("#ffffff"),
}

/**
 * Vérifie si les coordonnées sont dans une zone protégée de l'interface
 * @param x - Position X de la souris
 * @param y - Position Y de la souris
 * @returns true si les coordonnées sont dans une zone protégée
 */
function isInProtectedZone(x: number, y: number): boolean {
  if (typeof window === "undefined") return false

  // Zone en haut à gauche (compteur)
  if (x < 200 && y < 100) return true

  // Zone en haut à droite (recherche, toggle et zoom) - élargie
  if (typeof window !== "undefined" && x > window.innerWidth - 450 && y < 100) return true

  return false
}

export interface UseMouseEventsReturn {
  resetHighlight: () => void
  highlightMountainGroup: (group: THREE.Group) => void
  handleMouseDown: (event: MouseEvent) => void
  handleMouseMove: (event: MouseEvent) => void
  handleMouseUp: (event: MouseEvent) => void
  isDraggingRef: React.MutableRefObject<boolean>
  mouseStartPosRef: React.MutableRefObject<{ x: number; y: number } | null>
  lastClickTimeRef: React.MutableRefObject<number>
}

/**
 * Hook de gestion des événements souris pour l'interaction avec la sphère
 * @param tooltipRef - Référence vers l'élément tooltip
 * @param sceneRef - Référence vers la scène Three.js
 * @param cameraRef - Référence vers la caméra Three.js
 * @param controlsEnabled - État d'activation des contrôles
 * @param selectedTrajectory - Trajectoire sélectionnée
 * @param isMoving - État de mouvement de la caméra
 * @param setLastMoveTime - Fonction pour définir le dernier temps de mouvement
 * @returns Gestionnaires d'événements souris et références
 */
export function useMouseEvents(
  tooltipRef: React.MutableRefObject<HTMLDivElement | null>,
  sceneRef: React.MutableRefObject<THREE.Scene | null>,
  cameraRef: React.MutableRefObject<THREE.PerspectiveCamera | null>,
  controlsEnabled: boolean,
  selectedTrajectory: LifeTrajectory | null,
  isMoving: boolean,
  setLastMoveTime: (time: number) => void,
): UseMouseEventsReturn {
  const hoveredGroupRef = useRef<THREE.Group | null>(null)
  const originalMaterialsRef = useRef<Map<THREE.Object3D, THREE.Material>>(new Map())
  const mouseStartPosRef = useRef<{ x: number; y: number } | null>(null)
  const isDraggingRef = useRef(false)
  const lastClickTimeRef = useRef(0)

  /**
   * Réinitialise le surlignage du groupe survolé
   */
  const resetHighlight = useCallback(() => {
    if (!hoveredGroupRef.current) {
      return
    }

    hoveredGroupRef.current.traverse((child) => {
      if (child instanceof THREE.Line) {
        const originalMaterial = originalMaterialsRef.current.get(child)
        if (originalMaterial) {
          child.material = originalMaterial
        }
      }
    })

    originalMaterialsRef.current.clear()
    hoveredGroupRef.current = null

    if (tooltipRef.current) {
      tooltipRef.current.style.display = "none"
    }

    document.body.style.cursor = "auto"
  }, [])

  /**
   * Surligne un groupe de montagne lors du survol
   * @param group - Groupe Three.js à surligner
   */
  const highlightMountainGroup = useCallback(
    (group: THREE.Group) => {
      if (hoveredGroupRef.current === group) {
        return
      }

      resetHighlight()

      hoveredGroupRef.current = group

      group.traverse((child) => {
        if (child instanceof THREE.Line) {
          originalMaterialsRef.current.set(child, child.material)

          const highlightMaterial = new THREE.LineBasicMaterial({
            color: COLORS.highlight,
            transparent: true,
            opacity: 1.0,
            linewidth: 2,
          })

          child.material = highlightMaterial
        }
      })

      if (tooltipRef.current) {
        const metadata = group.userData
        let tooltipContent = ""

        if (metadata.type === "trajectory") {
          const trajectory = metadata.data
          const userCode = trajectory.userCode || trajectory.id.substring(0, 4).toUpperCase()

          const progressionPercent = calculateIndividualImprovement(trajectory)

          tooltipContent = `
            <div class="font-bold text-base">Parcours de ${userCode}</div>
            ${trajectory.typeMesure ? `<div class="text-xs text-gray-300 mt-1">Type: ${trajectory.typeMesure}</div>` : ""}
            <div class="text-xs text-gray-300">Début: ${trajectory.startYear}</div>
            <div class="text-xs text-gray-300">
              <span class="text-gray-400">Progression post-jobtrek:</span>
              <span class="${progressionPercent >= 0 ? "text-green-400" : "text-red-400"}">
                ${progressionPercent >= 0 ? "+" : ""}${progressionPercent}%
              </span>
            </div>
            <div class="text-xs text-blue-300 mt-1">Cliquez pour voir le profil</div>
          `
        } else {
          tooltipContent = `
            <div class="font-bold text-base">${metadata.name}</div>
            <div class="text-xs text-gray-300 mt-1">Type: Élément de fond</div>
          `
        }

        tooltipRef.current.innerHTML = tooltipContent
        tooltipRef.current.style.display = "block"
      }

      document.body.style.cursor = "pointer"
    },
    [resetHighlight],
  )

  /**
   * Gère l'événement mousedown
   * @param event - Événement souris
   */
  const handleMouseDown = useCallback(
    (event: MouseEvent) => {
      if ((event.target as HTMLElement).closest('[data-ui-element="true"]')) {
        return
      }

      if (isInProtectedZone(event.clientX, event.clientY)) {
        return
      }

      if (!controlsEnabled || selectedTrajectory) return

      mouseStartPosRef.current = { x: event.clientX, y: event.clientY }
      isDraggingRef.current = false
    },
    [controlsEnabled, selectedTrajectory],
  )

  /**
   * Gère l'événement mousemove
   * @param event - Événement souris
   */
  const handleMouseMove = useCallback(
    (event: MouseEvent) => {
      if (typeof window === "undefined") return

      const isUIElement = (event.target as HTMLElement).closest('[data-ui-element="true"]')
      const isProtectedZone = isInProtectedZone(event.clientX, event.clientY)

      if (isUIElement) {
        return
      }

      if (isProtectedZone) {
        if (hoveredGroupRef.current) {
          resetHighlight()
        }
        return
      }

      if (!controlsEnabled || selectedTrajectory) {
        return
      }

      if (mouseStartPosRef.current) {
        const dx = Math.abs(event.clientX - mouseStartPosRef.current.x)
        const dy = Math.abs(event.clientY - mouseStartPosRef.current.y)

        if (dx > 5 || dy > 5) {
          isDraggingRef.current = true
          resetHighlight()
          setLastMoveTime(Date.now())
          return
        }
      }

      if (isMoving) {
        if (hoveredGroupRef.current) {
          resetHighlight()
        }
        return
      }

      const mouse = new THREE.Vector2()
      if (typeof window !== "undefined") {
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1
      }

      if (!cameraRef.current || !sceneRef.current) {
        return
      }

      const raycaster = new THREE.Raycaster()
      raycaster.params.Line = { threshold: 0.2 }
      raycaster.setFromCamera(mouse, cameraRef.current)

      const intersects = raycaster.intersectObjects(sceneRef.current.children, true)

      if (intersects.length > 0) {
        for (let i = 0; i < intersects.length; i++) {
          const intersect = intersects[i]
          const object = intersect.object

          if (object instanceof THREE.Line && object.userData.isOutline) {
            const parentGroup = object.userData.parentGroup
            if (parentGroup) {
              highlightMountainGroup(parentGroup)

              if (tooltipRef.current) {
                tooltipRef.current.style.left = `${event.clientX + 15}px`
                tooltipRef.current.style.top = `${event.clientY + 15}px`
              }

              return
            }
          }
        }
      }

      if (hoveredGroupRef.current) {
        resetHighlight()
      }
    },
    [controlsEnabled, selectedTrajectory, isMoving, resetHighlight, highlightMountainGroup, setLastMoveTime],
  )

  /**
   * Gère l'événement mouseup
   * @param event - Événement souris
   */
  const handleMouseUp = useCallback(
    (event: MouseEvent) => {
      if ((event.target as HTMLElement).closest('[data-ui-element="true"]')) {
        return
      }

      if (isInProtectedZone(event.clientX, event.clientY)) {
        return
      }

      setTimeout(() => {
        mouseStartPosRef.current = null
        if (isDraggingRef.current) {
          isDraggingRef.current = false
          setLastMoveTime(Date.now())
        }
      }, 50)
    },
    [setLastMoveTime],
  )

  return {
    resetHighlight,
    highlightMountainGroup,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    isDraggingRef,
    mouseStartPosRef,
    lastClickTimeRef,
  }
}
