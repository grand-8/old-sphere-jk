"use client"

import type React from "react"
import { useCallback } from "react"
import * as THREE from "three"
import type { VisualizationState } from "./use-visualization-state"
import type { UseThreeSceneReturn } from "./use-three-scene"
import type { UseMouseEventsReturn } from "./use-mouse-events"

const CAMERA_POSITIONS = {
  DEFAULT: 7,
  CENTER: 0,
}

/**
 * Vérifie si les coordonnées sont dans une zone protégée de l'interface
 * @param x - Position X de la souris
 * @param y - Position Y de la souris
 * @returns true si les coordonnées sont dans une zone protégée
 */
function isInProtectedZone(x: number, y: number): boolean {
  // Zone en haut à gauche (compteur)
  if (x < 200 && y < 100) return true

  // Zone en haut à droite (recherche, toggle et zoom) - élargie
  if (x > window.innerWidth - 450 && y < 100) return true

  return false
}

interface UseInteractionManagerReturn {
  performZoom: (zoomIn: boolean, onComplete?: () => void) => void
  handleCloseProfile: (e?: React.MouseEvent) => void
  setupEventListeners: () => () => void
}

/**
 * Hook de gestion des interactions utilisateur
 * Centralise zoom, modal, click et hover
 * @param visualizationState - État de la visualisation
 * @param threeScene - Scène Three.js
 * @param mouseEvents - Événements souris
 * @returns Gestionnaires d'interaction
 */
export function useInteractionManager(
  visualizationState: VisualizationState,
  threeScene: UseThreeSceneReturn,
  mouseEvents: UseMouseEventsReturn,
): UseInteractionManagerReturn {
  const {
    selectedTrajectory,
    setSelectedTrajectory,
    controlsEnabled,
    setControlsEnabled,
    isZoomedIn,
    setIsZoomedIn,
    isMoving,
    setIsMoving,
    setLastMoveTime,
    moveTimeoutRef,
  } = visualizationState

  const { cameraRef, controlsRef, sceneRef, isRendering } = threeScene

  const {
    resetHighlight,
    isDraggingRef,
    mouseStartPosRef,
    lastClickTimeRef,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
  } = mouseEvents

  /**
   * Effectue un zoom avant ou arrière sur la sphère
   * @param zoomIn - true pour zoomer, false pour dézoomer
   * @param onComplete - Callback à exécuter une fois le zoom terminé
   */
  const performZoom = useCallback(
    (zoomIn: boolean, onComplete?: () => void) => {
      if (!cameraRef.current || !controlsRef.current) {
        return
      }

      setIsZoomedIn(zoomIn)

      if (zoomIn && controlsRef.current) {
        controlsRef.current.minDistance = 0.1
        controlsRef.current.maxDistance = 20
      }

      if (controlsRef.current) {
        controlsRef.current.enabled = false
      }

      const targetPosition = zoomIn
        ? new THREE.Vector3(0, 0, CAMERA_POSITIONS.CENTER)
        : new THREE.Vector3(0, 0, CAMERA_POSITIONS.DEFAULT)

      const startPosition = new THREE.Vector3().copy(cameraRef.current.position)
      const startTime = Date.now()
      const duration = 1500

      const animateZoom = () => {
        const elapsed = Date.now() - startTime
        const progress = Math.min(elapsed / duration, 1)
        const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)
        const easedProgress = easeOutCubic(progress)

        const newPosition = new THREE.Vector3().lerpVectors(startPosition, targetPosition, easedProgress)

        if (cameraRef.current) {
          cameraRef.current.position.copy(newPosition)
        }

        if (progress < 1) {
          requestAnimationFrame(animateZoom)
        } else {
          if (controlsRef.current) {
            if (zoomIn) {
              setTimeout(() => {
                if (controlsRef.current && isRendering) {
                  controlsRef.current.enabled = true
                  setControlsEnabled(true)

                  if (onComplete) {
                    onComplete()
                  }
                }
              }, 100)
            } else {
              controlsRef.current.minDistance = 5
              controlsRef.current.maxDistance = 20

              controlsRef.current.reset()

              if (cameraRef.current) {
                cameraRef.current.position.set(0, 0, CAMERA_POSITIONS.DEFAULT)
                cameraRef.current.lookAt(0, 0, 0)
              }

              controlsRef.current.target.set(0, 0, 0)

              setTimeout(() => {
                if (controlsRef.current && isRendering) {
                  controlsRef.current.enabled = true
                  controlsRef.current.update()
                  setControlsEnabled(true)
                  setIsMoving(false)
                }
              }, 100)

              if (onComplete) {
                onComplete()
              }
            }
          }
        }
      }

      animateZoom()
    },
    [controlsEnabled, isZoomedIn, isRendering, setIsZoomedIn, setControlsEnabled, setIsMoving],
  )

  /**
   * Gère la fermeture du profil/modal
   * @param e - Événement React optionnel
   */
  const handleCloseProfile = useCallback(
    (e?: React.MouseEvent) => {
      if (e) {
        e.preventDefault()
        e.stopPropagation()
      }

      setControlsEnabled(false)

      if (isZoomedIn) {
        performZoom(false, () => {
          setSelectedTrajectory(null)
        })
      } else {
        setSelectedTrajectory(null)
        setControlsEnabled(true)
      }
    },
    [isZoomedIn, selectedTrajectory?.name, setControlsEnabled, performZoom, setSelectedTrajectory],
  )

  /**
   * Configure les écouteurs d'événements pour les interactions utilisateur
   * @returns Fonction de nettoyage pour supprimer les écouteurs
   */
  const setupEventListeners = useCallback(() => {
    const raycaster = new THREE.Raycaster()
    raycaster.params.Line = { threshold: 0.2 }
    const mouse = new THREE.Vector2()

    const handleClick = (event: MouseEvent) => {
      if ((event.target as HTMLElement).closest('[data-ui-element="true"]')) {
        return
      }

      if (isInProtectedZone(event.clientX, event.clientY)) {
        return
      }

      if (!controlsEnabled) {
        return
      }

      if (isDraggingRef.current) {
        isDraggingRef.current = false
        mouseStartPosRef.current = null
        return
      }

      const now = Date.now()
      if (now - lastClickTimeRef.current < 300) {
        lastClickTimeRef.current = now
        return
      }
      lastClickTimeRef.current = now

      mouse.x = (event.clientX / window.innerWidth) * 2 - 1
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1

      if (!cameraRef.current || !sceneRef.current) {
        return
      }

      raycaster.setFromCamera(mouse, cameraRef.current)
      const intersects = raycaster.intersectObjects(sceneRef.current.children, true)

      if (intersects.length > 0) {
        for (let i = 0; i < intersects.length; i++) {
          const intersect = intersects[i]
          const object = intersect.object

          if (object instanceof THREE.Line && object.userData.isOutline) {
            const parentGroup = object.userData.parentGroup
            if (parentGroup) {
              const metadata = parentGroup.userData

              if (metadata.type === "trajectory") {
                const trajectory = metadata.data

                if (!isZoomedIn) {
                  setControlsEnabled(false)
                  performZoom(true, () => {
                    setSelectedTrajectory(trajectory)
                  })
                } else {
                  setSelectedTrajectory(trajectory)
                }
                return
              }
            }
          }
        }
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        document.activeElement &&
        (document.activeElement.tagName === "INPUT" ||
          document.activeElement.tagName === "TEXTAREA" ||
          document.activeElement.tagName === "SELECT")
      ) {
        return
      }
    }

    window.addEventListener("mousedown", handleMouseDown)
    window.addEventListener("mousemove", handleMouseMove)
    window.addEventListener("mouseup", handleMouseUp)
    window.addEventListener("click", handleClick)
    window.addEventListener("keydown", handleKeyDown)

    return () => {
      window.removeEventListener("mousedown", handleMouseDown)
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("mouseup", handleMouseUp)
      window.removeEventListener("click", handleClick)
      window.removeEventListener("keydown", handleKeyDown)

      if (moveTimeoutRef.current) {
        clearTimeout(moveTimeoutRef.current)
      }
    }
  }, [
    controlsEnabled,
    selectedTrajectory,
    isZoomedIn,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    performZoom,
    setControlsEnabled,
    setSelectedTrajectory,
  ])

  return {
    performZoom,
    handleCloseProfile,
    setupEventListeners,
  }
}
