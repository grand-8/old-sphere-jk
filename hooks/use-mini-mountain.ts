"use client"

import type React from "react"

import { useRef, useEffect, useCallback } from "react"
import * as THREE from "three"
import type { LifeTrajectory } from "@/lib/data-service"
import { calculateDynamicAmplification, calculatePointHeight } from "@/lib/mountain-calculations"

const COLORS = {
  darkBlue: new THREE.Color("#1a2b4d"),
  mediumBlue: new THREE.Color("#2d4b6e"),
  tealBlue: new THREE.Color("#3d6b7c"),
  teal: new THREE.Color("#4d8a7a"),
  lightGreen: new THREE.Color("#7ab555"),
  highlight: new THREE.Color("#ffffff"),
}

interface UseMiniMountainReturn {
  canvasRef: React.RefObject<HTMLCanvasElement>
  isReady: boolean
}

export function useMiniMountain(trajectory: LifeTrajectory | null): UseMiniMountainReturn {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const mountainGroupRef = useRef<THREE.Group | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const isReadyRef = useRef(false)

  const createMiniMountain = useCallback((trajectory: LifeTrajectory, parent: THREE.Group, color: THREE.Color) => {
    const mountainGroup = new THREE.Group()
    mountainGroup.userData = {
      name: trajectory.name,
      type: "trajectory",
      data: trajectory,
    }

    if (!trajectory.points || trajectory.points.length === 0) {
      parent.add(mountainGroup)
      return mountainGroup
    }

    const baseRadius = 0.8 // Rayon de base réduit pour la mini-montagne
    const maxHeight = 1.0 // Hauteur maximale réduite
    const dataPoints = trajectory.points

    // Calculs d'amplification dynamique
    const calculation = calculateDynamicAmplification(dataPoints)

    // Créer les points temporels sur la circonférence
    const circumferencePoints: THREE.Vector3[] = []
    const circumferenceColors: number[] = []

    for (let i = 0; i < dataPoints.length; i++) {
      const point = dataPoints[i]
      const angle = (i / dataPoints.length) * Math.PI * 2

      // Position sur la circonférence
      const x = Math.cos(angle) * baseRadius
      const z = Math.sin(angle) * baseRadius

      // Hauteur selon la valeur avec amplification dynamique
      const peakHeight = calculatePointHeight(point.cumulativeScore, calculation, maxHeight)
      const y = Math.max(peakHeight, 0.05)

      circumferencePoints.push(new THREE.Vector3(x, y, z))

      // Couleur avec normalisation dynamique
      const offsetScore = point.cumulativeScore + calculation.verticalOffset
      const amplifiedScore = offsetScore * calculation.amplificationDynamique
      const normalizedHeight = amplifiedScore / calculation.maxAmplifiedScore
      const pointColor = new THREE.Color(color).lerp(new THREE.Color(0xffffff), normalizedHeight * 0.3)
      circumferenceColors.push(pointColor.r, pointColor.g, pointColor.b)
    }

    // Point central élevé pour la convergence
    const avgHeight = circumferencePoints.reduce((sum, p) => sum + p.y, 0) / circumferencePoints.length
    const centralHeight = avgHeight * 1.2 // Légèrement plus haut que la moyenne
    const centralPoint = new THREE.Vector3(0, centralHeight, 0)

    // Points de base circulaire
    const basePoints: THREE.Vector3[] = []
    for (let i = 0; i < dataPoints.length; i++) {
      const angle = (i / dataPoints.length) * Math.PI * 2
      const x = Math.cos(angle) * baseRadius
      const z = Math.sin(angle) * baseRadius
      basePoints.push(new THREE.Vector3(x, 0, z))
    }

    // Créer les lignes de la structure wireframe
    const lines: THREE.Vector3[][] = []

    // 1. Contour de la base circulaire
    for (let i = 0; i < basePoints.length; i++) {
      const nextI = (i + 1) % basePoints.length
      lines.push([basePoints[i], basePoints[nextI]])
    }

    // 2. Lignes verticales des pics
    for (let i = 0; i < circumferencePoints.length; i++) {
      lines.push([basePoints[i], circumferencePoints[i]])
    }

    // 3. Contour des pics sur la circonférence
    for (let i = 0; i < circumferencePoints.length; i++) {
      const nextI = (i + 1) % circumferencePoints.length
      lines.push([circumferencePoints[i], circumferencePoints[nextI]])
    }

    // 4. Lignes de convergence vers le centre
    for (let i = 0; i < circumferencePoints.length; i++) {
      lines.push([circumferencePoints[i], centralPoint])
    }

    // 5. Triangulation de la surface (quelques lignes internes)
    for (let i = 0; i < circumferencePoints.length; i += 2) {
      const nextI = (i + 1) % circumferencePoints.length
      lines.push([circumferencePoints[i], circumferencePoints[nextI]])
    }

    // Créer les géométries et matériaux pour chaque ligne
    lines.forEach((linePoints, index) => {
      const geometry = new THREE.BufferGeometry().setFromPoints(linePoints)

      // Couleur basée sur le type de ligne
      let lineColor = color
      if (index < basePoints.length) {
        // Lignes de base - plus sombres
        lineColor = new THREE.Color(color).multiplyScalar(0.6)
      } else if (index >= lines.length - circumferencePoints.length) {
        // Lignes de convergence - plus claires
        lineColor = new THREE.Color(color).lerp(new THREE.Color(0xffffff), 0.2)
      }

      const material = new THREE.LineBasicMaterial({
        color: lineColor,
        transparent: true,
        opacity: 0.8,
        linewidth: 1,
      })

      const line = new THREE.Line(geometry, material)
      mountainGroup.add(line)
    })

    parent.add(mountainGroup)
    return mountainGroup
  }, [])

  // Fonction pour obtenir la couleur de catégorie
  const getCategoryColor = useCallback((category: string) => {
    const baseColor = new THREE.Color()

    switch (category) {
      case "education":
        baseColor.copy(COLORS.tealBlue)
        break
      case "career":
        baseColor.copy(COLORS.teal)
        break
      case "entrepreneurship":
        baseColor.copy(COLORS.lightGreen)
        break
      case "health":
        baseColor.copy(COLORS.mediumBlue)
        break
      default:
        baseColor.copy(COLORS.teal)
    }

    return baseColor
  }, [])

  // Initialisation de la scène
  useEffect(() => {
    if (!canvasRef.current || !trajectory) return

    // Créer la scène
    const scene = new THREE.Scene()
    sceneRef.current = scene

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100)
    camera.position.set(1.5, 1.2, 2.5)
    camera.lookAt(0, 0.3, 0)
    cameraRef.current = camera

    // Créer le renderer
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      alpha: true,
    })
    renderer.setSize(128, 128) // Taille fixe pour la mini-scène
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setClearColor(0x000000, 0) // Fond transparent
    rendererRef.current = renderer

    // Ajouter l'éclairage
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
    scene.add(ambientLight)

    const pointLight = new THREE.PointLight(0xffffff, 0.8)
    pointLight.position.set(2, 2, 2)
    scene.add(pointLight)

    // Créer la mini-montagne avec amplification dynamique
    const categoryColor = getCategoryColor(trajectory.category)
    const mountainGroup = createMiniMountain(trajectory, scene, categoryColor)
    mountainGroupRef.current = mountainGroup

    isReadyRef.current = true

    console.log("🏔️ Mini-montagne initialisée avec amplification dynamique:", {
      trajectoryName: trajectory.name,
      category: trajectory.category,
      pointsCount: trajectory.points?.length || 0,
    })

    // Animation de rotation
    const animate = () => {
      if (!isReadyRef.current || !mountainGroupRef.current || !rendererRef.current || !cameraRef.current) {
        return
      }

      mountainGroupRef.current.rotation.y += 0.008

      // Rendu
      rendererRef.current.render(scene, cameraRef.current)
      animationFrameRef.current = requestAnimationFrame(animate)
    }

    animate()

    // Nettoyage
    return () => {
      isReadyRef.current = false

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }

      if (rendererRef.current) {
        rendererRef.current.dispose()
      }

      if (sceneRef.current) {
        sceneRef.current.traverse((object) => {
          if (object instanceof THREE.Mesh || object instanceof THREE.Line) {
            if (object.geometry) {
              object.geometry.dispose()
            }
            if (object.material instanceof THREE.Material) {
              object.material.dispose()
            } else if (Array.isArray(object.material)) {
              object.material.forEach((material) => material.dispose())
            }
          }
        })
      }
    }
  }, [trajectory, createMiniMountain, getCategoryColor])

  return {
    canvasRef,
    isReady: isReadyRef.current,
  }
}
