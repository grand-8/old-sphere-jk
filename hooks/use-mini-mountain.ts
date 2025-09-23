"use client"

import type React from "react"
import { useRef, useEffect, useCallback } from "react"
import * as THREE from "three"
import type { LifeTrajectory } from "@/lib/data-service"
import {
  calculateDynamicAmplification,
  calculatePointHeight,
  getUnifiedMountainConfig,
} from "@/utils/sphere/mountain-calculations"

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

    const baseRadius = 0.8 // Doublé de 0.4 à 0.8
    const maxHeight = 1.0 // Doublé de 0.5 à 1.0
    const dataPoints = trajectory.points

    const calculation = calculateDynamicAmplification(dataPoints)
    const config = getUnifiedMountainConfig(false)

    const ridgePoints: THREE.Vector3[] = []
    const ridgeColors: number[] = []

    for (let i = 0; i < dataPoints.length; i++) {
      const point = dataPoints[i]
      const angle = (i / dataPoints.length) * Math.PI * 2

      const x = Math.cos(angle) * baseRadius
      const z = Math.sin(angle) * baseRadius

      let peakHeight = calculatePointHeight(point.cumulativeScore, calculation, maxHeight)

      const scoreVariation = (point.score * calculation.amplificationDynamique) / 10
      const individualPeakHeight = scoreVariation * config.individualVariation
      peakHeight += individualPeakHeight

      const y = Math.max(peakHeight, 0.05)

      ridgePoints.push(new THREE.Vector3(x, y, z))

      const offsetScore = point.cumulativeScore + calculation.verticalOffset
      const amplifiedScore = offsetScore * calculation.amplificationDynamique
      const normalizedHeight = amplifiedScore / calculation.maxAmplifiedScore
      const pointColor = new THREE.Color(color).lerp(new THREE.Color(0xffffff), normalizedHeight * 0.3)
      ridgeColors.push(pointColor.r, pointColor.g, pointColor.b)
    }

    const avgHeight = ridgePoints.reduce((sum, p) => sum + p.y, 0) / ridgePoints.length
    const centralHeight = avgHeight * config.centralHeightMultiplier
    const centralPoint = new THREE.Vector3(0, centralHeight, 0)

    const basePointsCount = Math.max(12, dataPoints.length * 2)
    const basePoints: THREE.Vector3[] = []
    for (let i = 0; i < basePointsCount; i++) {
      const angle = (i / basePointsCount) * Math.PI * 2
      const x = Math.cos(angle) * baseRadius
      const z = Math.sin(angle) * baseRadius
      basePoints.push(new THREE.Vector3(x, 0.05, z)) // Base légèrement élevée
    }

    const lines: THREE.Vector3[][] = []

    for (let i = 0; i < basePoints.length; i++) {
      const nextI = (i + 1) % basePoints.length
      lines.push([basePoints[i], basePoints[nextI]])
    }

    for (let i = 0; i < ridgePoints.length; i++) {
      const ridgeAngle = (i / ridgePoints.length) * 2 * Math.PI
      const closestBaseIndex = Math.round((ridgeAngle / (2 * Math.PI)) * basePoints.length) % basePoints.length
      lines.push([basePoints[closestBaseIndex], ridgePoints[i]])
    }

    for (let i = 0; i < ridgePoints.length; i++) {
      const nextI = (i + 1) % ridgePoints.length
      lines.push([ridgePoints[i], ridgePoints[nextI]])
    }

    for (let i = 0; i < ridgePoints.length; i++) {
      lines.push([ridgePoints[i], centralPoint])
    }

    for (let i = 0; i < ridgePoints.length; i += 2) {
      const nextI = (i + 1) % ridgePoints.length
      lines.push([ridgePoints[i], ridgePoints[nextI]])
    }

    lines.forEach((linePoints, index) => {
      const geometry = new THREE.BufferGeometry().setFromPoints(linePoints)

      const colorsArray: number[] = []

      const maxY = Math.max(...linePoints.map((p) => p.y))
      const minY = Math.min(...linePoints.map((p) => p.y))
      const heightRange = maxY - minY

      linePoints.forEach((point) => {
        const normalizedHeight = heightRange > 0 ? (point.y - minY) / heightRange : 0

        const gradientColor = new THREE.Color(color)
        gradientColor.lerp(new THREE.Color(0xffffff), normalizedHeight * 0.9)

        colorsArray.push(gradientColor.r, gradientColor.g, gradientColor.b)
      })

      const colorArray = new Float32Array(colorsArray)
      geometry.setAttribute("color", new THREE.BufferAttribute(colorArray, 3))

      const material = new THREE.LineBasicMaterial({
        vertexColors: true,
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

  useEffect(() => {
    if (!canvasRef.current || !trajectory) return

    const scene = new THREE.Scene()
    sceneRef.current = scene

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100)
    camera.position.set(1.5, 1.2, 2.5)
    camera.lookAt(0, 0.3, 0)
    cameraRef.current = camera

    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      alpha: true,
    })
    renderer.setSize(128, 128)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setClearColor(0x000000, 0)
    rendererRef.current = renderer

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
    scene.add(ambientLight)

    const pointLight = new THREE.PointLight(0xffffff, 0.8)
    pointLight.position.set(2, 2, 2)
    scene.add(pointLight)

    const categoryColor = getCategoryColor(trajectory.category)
    const mountainGroup = createMiniMountain(trajectory, scene, categoryColor)
    mountainGroupRef.current = mountainGroup

    isReadyRef.current = true

    console.log("🏔️ Mini-montagne initialisée avec amplification dynamique:", {
      trajectoryName: trajectory.name,
      category: trajectory.category,
      pointsCount: trajectory.points?.length || 0,
    })

    const animate = () => {
      if (!isReadyRef.current || !mountainGroupRef.current || !rendererRef.current || !cameraRef.current) {
        return
      }

      mountainGroupRef.current.rotation.y += 0.008

      rendererRef.current.render(scene, cameraRef.current)
      animationFrameRef.current = requestAnimationFrame(animate)
    }

    animate()

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
