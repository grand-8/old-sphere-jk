"use client"

import type React from "react"
import { useCallback } from "react"
import * as THREE from "three"
import type { LifeTrajectory } from "@/lib/data-generator"
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

const MIN_TRAJECTORIES = 10

interface UseMountainGenerationReturn {
  updateMountains: (trajectories: LifeTrajectory[], isDirectCodeSearch?: boolean) => Promise<void>
  clearMountains: (parent: THREE.Group) => void
  addTrajectoryMountains: (
    parent: THREE.Group,
    radius: number,
    trajectories: LifeTrajectory[],
    isDirectCodeSearch?: boolean,
  ) => void
}

export function useMountainGeneration(
  sphereGroupRef: React.MutableRefObject<THREE.Group | null>,
  isRendering: boolean,
  setIsUpdatingMountains: (value: boolean) => void,
  setFilterError: (error: string | null) => void,
): UseMountainGenerationReturn {
  const clearMountains = useCallback((parent: THREE.Group) => {
    const mountainsToRemove: THREE.Object3D[] = []

    parent.traverse((child) => {
      if (child instanceof THREE.Group && child.userData && child.userData.type === "trajectory") {
        mountainsToRemove.push(child)
      }
    })

    for (const mountain of mountainsToRemove) {
      mountain.traverse((child) => {
        if (child instanceof THREE.Mesh || child instanceof THREE.Line) {
          if (child.geometry) {
            child.geometry.dispose()
          }

          if (child.material instanceof THREE.Material) {
            child.material.dispose()
          } else if (Array.isArray(child.material)) {
            child.material.forEach((material) => material.dispose())
          }
        }
      })

      parent.remove(mountain)
    }
  }, [])

  const createGradientOutlineMountain = useCallback(
    (
      position: THREE.Vector3,
      normal: THREE.Vector3,
      heightFactor: number,
      parent: THREE.Group,
      color: THREE.Color,
      metadata: { name: string; type: string; data: any },
      opacity = 0.5,
      customBaseWidth?: number,
    ) => {
      console.log("🏗️ createCircularMountain:", {
        name: metadata.name,
        type: metadata.type,
        heightFactor,
        opacity,
        customBaseWidth,
      })

      const config = getUnifiedMountainConfig(false)

      const mountainGroup = new THREE.Group()
      mountainGroup.position.copy(position)
      mountainGroup.userData = metadata

      const worldUp = new THREE.Vector3(0, 1, 0)
      const quaternion = new THREE.Quaternion()
      const rotationAxis = new THREE.Vector3().crossVectors(worldUp, normal).normalize()
      const angle = Math.acos(worldUp.dot(normal))

      if (rotationAxis.lengthSq() > 0.001) {
        quaternion.setFromAxisAngle(rotationAxis, angle)
      } else {
        if (normal.y < 0) {
          quaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI)
        } else {
          quaternion.identity()
        }
      }

      mountainGroup.quaternion.copy(quaternion)

      const randomRotationGroup = new THREE.Group()
      const randomXAngle = ((Math.random() - 0.5) * Math.PI) / 32
      const randomYAngle = ((Math.random() - 0.5) * Math.PI) / 32
      randomRotationGroup.rotateX(randomXAngle)
      randomRotationGroup.rotateY(randomYAngle)

      const rotationSpeed = 0.003 + Math.random() * 0.004 // Random rotation speed between 0.003 and 0.007 (plus visible)
      const rotationAxisName = Math.random() < 0.33 ? "x" : Math.random() < 0.5 ? "y" : "z" // Ajout de l'axe Z pour plus de variété
      randomRotationGroup.userData.rotationSpeed = rotationSpeed
      randomRotationGroup.userData.rotationAxis = rotationAxisName
      randomRotationGroup.userData.isRotatingPeak = true

      mountainGroup.add(randomRotationGroup)

      const height = config.maxHeight
      const baseRadius = config.baseRadius

      const points: THREE.Vector3[] = []
      const colors: number[] = []

      const baseCirclePoints: THREE.Vector3[] = []
      const baseCircleColors: number[] = []

      const adaptiveBase = 0.05

      if (metadata.type === "trajectory" && metadata.data.points && metadata.data.points.length > 1) {
        const trajectory = metadata.data
        const dataPoints = trajectory.points

        const calculation = calculateDynamicAmplification(dataPoints)

        console.log("🏗️ Individual peaks crown generation:", {
          trajectoryName: metadata.name,
          dataPointsCount: dataPoints.length,
          baseRadius,
        })

        const ridgePoints: THREE.Vector3[] = []
        const ridgeColors: number[] = []

        for (let i = 0; i < dataPoints.length; i++) {
          const point = dataPoints[i]

          const angle = (i / dataPoints.length) * 2 * Math.PI
          const x = baseRadius * Math.cos(angle)
          const z = baseRadius * Math.sin(angle)

          let peakHeight = calculatePointHeight(point.cumulativeScore, calculation, height)

          const scoreVariation = (point.score * calculation.amplificationDynamique) / 10
          const individualPeakHeight = scoreVariation * config.individualVariation
          peakHeight += individualPeakHeight

          const y = Math.max(peakHeight, 0.05)

          ridgePoints.push(new THREE.Vector3(x, y, z))

          console.log(`🏗️ Individual peak ${i}:`, {
            angle: ((angle * 180) / Math.PI).toFixed(1) + "°",
            position: { x: x.toFixed(2), y: y.toFixed(2), z: z.toFixed(2) },
            originalScore: point.cumulativeScore,
            individualVariation: individualPeakHeight.toFixed(3),
          })

          const offsetScore = point.cumulativeScore + calculation.verticalOffset
          const amplifiedScore = offsetScore * calculation.amplificationDynamique
          const normalizedHeight = amplifiedScore / calculation.maxAmplifiedScore
          const pointColor = new THREE.Color(color).lerp(new THREE.Color(0xffffff), normalizedHeight * 0.3)
          ridgeColors.push(pointColor.r, pointColor.g, pointColor.b)
        }

        const averageHeight = ridgePoints.reduce((sum, p) => sum + p.y, 0) / ridgePoints.length
        const centralHeight = averageHeight * config.centralHeightMultiplier
        const centralPoint = new THREE.Vector3(0, centralHeight, 0)
        const centralColor = new THREE.Color(color).lerp(new THREE.Color(0xffffff), 0.5)

        const basePointsCount = Math.max(12, dataPoints.length * 2)
        const basePoints: THREE.Vector3[] = []
        for (let i = 0; i < basePointsCount; i++) {
          const angle = (i / basePointsCount) * 2 * Math.PI
          const x = baseRadius * Math.cos(angle)
          const z = baseRadius * Math.sin(angle)
          basePoints.push(new THREE.Vector3(x, adaptiveBase, z))
        }

        const lines: THREE.Vector3[][] = []

        // 1. Contour de la base circulaire (always round with more points)
        for (let i = 0; i < basePoints.length; i++) {
          const nextI = (i + 1) % basePoints.length
          lines.push([basePoints[i], basePoints[nextI]])
        }

        // 2. Lignes verticales des pics (connect each ridge point to closest base point)
        for (let i = 0; i < ridgePoints.length; i++) {
          const ridgeAngle = (i / ridgePoints.length) * 2 * Math.PI
          const closestBaseIndex = Math.round((ridgeAngle / (2 * Math.PI)) * basePoints.length) % basePoints.length
          lines.push([basePoints[closestBaseIndex], ridgePoints[i]])
        }

        // 3. Contour des pics sur la circonférence (keep original data points connections)
        for (let i = 0; i < ridgePoints.length; i++) {
          const nextI = (i + 1) % ridgePoints.length
          lines.push([ridgePoints[i], ridgePoints[nextI]])
        }

        // 4. Lignes de convergence vers le centre (from ridge points only)
        for (let i = 0; i < ridgePoints.length; i++) {
          lines.push([ridgePoints[i], centralPoint])
        }

        // 5. Triangulation de la surface (quelques lignes internes between ridge points)
        for (let i = 0; i < ridgePoints.length; i += 2) {
          const nextI = (i + 1) % ridgePoints.length
          lines.push([ridgePoints[i], ridgePoints[nextI]])
        }

        lines.forEach((linePoints, index) => {
          const geometry = new THREE.BufferGeometry().setFromPoints(linePoints)

          const colorsArray: number[] = []

          // Trouver la hauteur max et min pour normaliser le dégradé
          const maxY = Math.max(...linePoints.map((p) => p.y))
          const minY = Math.min(...linePoints.map((p) => p.y))
          const heightRange = maxY - minY

          linePoints.forEach((point) => {
            // Normaliser la hauteur (0 = base, 1 = sommet)
            const normalizedHeight = heightRange > 0 ? (point.y - minY) / heightRange : 0

            // Créer un dégradé du blanc (sommet) vers la couleur de catégorie (base)
            // normalizedHeight = 1 (sommet) -> blanc pur
            // normalizedHeight = 0 (base) -> couleur de catégorie
            const gradientColor = new THREE.Color(color)
            gradientColor.lerp(new THREE.Color(0xffffff), normalizedHeight * 0.9)

            colorsArray.push(gradientColor.r, gradientColor.g, gradientColor.b)
          })

          const colorArray = new Float32Array(colorsArray)
          geometry.setAttribute("color", new THREE.BufferAttribute(colorArray, 3))

          const ridgeMaterial = new THREE.LineBasicMaterial({
            vertexColors: true, // Utiliser les couleurs par vertex pour le dégradé
            transparent: true,
            opacity: opacity,
            linewidth: 1,
          })

          const line = new THREE.Line(geometry, ridgeMaterial)
          line.userData = { isOutline: true, parentGroup: mountainGroup }
          randomRotationGroup.add(line)
        })

        console.log("🏗️ Individual peaks crown created:", {
          ridgePointsCount: ridgePoints.length,
          basePointsCount: basePoints.length,
          centralHeight: centralHeight.toFixed(3),
          adaptiveBase,
        })
      } else {
        const segments = 8
        const ridgePoints: THREE.Vector3[] = []
        const ridgeColors: number[] = []

        for (let i = 0; i <= segments; i++) {
          const angle = (i / segments) * 2 * Math.PI
          const x = baseRadius * Math.cos(angle)
          const z = baseRadius * Math.sin(angle)
          const y = height * (0.4 + Math.random() * 0.4)

          ridgePoints.push(new THREE.Vector3(x, y, z))

          const peakColor = new THREE.Color(color).lerp(new THREE.Color(0xffffff), 0.3)
          ridgeColors.push(peakColor.r, peakColor.g, peakColor.b)
        }

        const ridgeGeometry = new THREE.BufferGeometry().setFromPoints(ridgePoints)
        const ridgeColorArray = new Float32Array(ridgeColors)
        ridgeGeometry.setAttribute("color", new THREE.BufferAttribute(ridgeColorArray, 3))

        const ridgeMaterial = new THREE.LineBasicMaterial({
          vertexColors: true,
          transparent: true,
          opacity: opacity,
          linewidth: 1,
        })

        const ridgeLine = new THREE.Line(ridgeGeometry, ridgeMaterial)
        ridgeLine.userData = { isOutline: true, parentGroup: mountainGroup }
        randomRotationGroup.add(ridgeLine)
      }

      parent.add(mountainGroup)

      console.log("🏗️ Individual peaks crown added to parent:", {
        parentChildrenCount: parent.children.length,
        mountainGroupChildren: mountainGroup.children.length,
      })
    },
    [],
  )

  const addTrajectoryMountains = useCallback(
    (parent: THREE.Group, radius: number, trajectories: LifeTrajectory[], isDirectCodeSearch = false) => {
      console.log("🏗️ addTrajectoryMountains START:", {
        parentName: parent.constructor.name,
        radius,
        trajectoriesCount: trajectories?.length || 0,
        isValidArray: Array.isArray(trajectories),
        isDirectCodeSearch,
      })

      if (!trajectories || !Array.isArray(trajectories) || trajectories.length === 0) {
        console.warn("🏗️ addTrajectoryMountains ABORT: Aucune trajectoire valide")
        return
      }

      const trajectoriesForSphere = isDirectCodeSearch
        ? trajectories // Ne pas filtrer si c'est une recherche directe par code
        : trajectories.filter((trajectory) => trajectory.points && trajectory.points.length >= 3)

      console.log("🏗️ Filtering trajectories for sphere:", {
        originalCount: trajectories.length,
        filteredCount: trajectoriesForSphere.length,
        excludedCount: trajectories.length - trajectoriesForSphere.length,
        isDirectCodeSearch,
      })

      if (trajectoriesForSphere.length === 0) {
        console.warn("🏗️ addTrajectoryMountains ABORT: Aucune trajectoire avec 3+ étapes")
        return
      }

      const totalTrajectories = trajectoriesForSphere.length
      const minDistanceBetweenMountains = Math.max(0.3, 0.6 - totalTrajectories / 1000)
      const baseMountainWidth = Math.max(0.5, 0.8 - totalTrajectories / 2000)
      let trajectoryIndex = 0
      const trajectoryBatchSize = 20
      const usedPositions: THREE.Vector3[] = []
      let createdMountains = 0

      console.log("🏗️ addTrajectoryMountains CONFIG:", {
        totalTrajectories,
        minDistanceBetweenMountains,
        baseMountainWidth,
        trajectoryBatchSize,
      })

      function createTrajectoryBatch() {
        const endIndex = Math.min(trajectoryIndex + trajectoryBatchSize, totalTrajectories)
        const batchSize = endIndex - trajectoryIndex

        console.log("🏗️ createTrajectoryBatch:", {
          batchStart: trajectoryIndex,
          batchEnd: endIndex,
          batchSize,
          totalProgress: `${trajectoryIndex}/${totalTrajectories}`,
        })

        for (let i = trajectoryIndex; i < endIndex; i++) {
          try {
            const trajectory = trajectoriesForSphere[i]

            console.log(`🏗️ Création montagne ${i}:`, {
              name: trajectory.name,
              category: trajectory.category,
              pointsCount: trajectory.points?.length || 0,
            })

            const phi = Math.acos(1 - 2 * ((i + 0.5) / totalTrajectories))
            const theta = 2 * Math.PI * i * (1 / 1.618033988749895)
            const x = radius * Math.sin(phi) * Math.cos(theta)
            const y = radius * Math.sin(phi) * Math.sin(theta)
            const z = radius * Math.cos(phi)
            const position = new THREE.Vector3(x, y, z)

            let tooClose = false
            for (const usedPos of usedPositions) {
              if (position.distanceTo(usedPos) < minDistanceBetweenMountains) {
                tooClose = true
                break
              }
            }

            if (tooClose) {
              let foundPosition = false
              for (let attempt = 0; attempt < 10; attempt++) {
                const randPhi = Math.acos(2 * Math.random() - 1)
                const randTheta = 2 * Math.PI * Math.random()
                const newX = radius * Math.sin(randPhi) * Math.cos(randTheta)
                const newY = radius * Math.sin(randPhi) * Math.sin(randTheta)
                const newZ = radius * Math.cos(randPhi)
                const newPosition = new THREE.Vector3(newX, newY, newZ)
                let newTooClose = false
                for (const usedPos of usedPositions) {
                  if (newPosition.distanceTo(usedPos) < minDistanceBetweenMountains) {
                    newTooClose = true
                    break
                  }
                }

                if (!newTooClose) {
                  position.copy(newPosition)
                  foundPosition = true
                  tooClose = false
                  break
                }
              }

              if (!foundPosition) {
                console.log(`🏗️ Position sous-optimale pour montagne ${i}`)
              }
            }

            usedPositions.push(position.clone())
            const normal = position.clone().normalize()
            const normalizedY = (position.y + radius) / (2 * radius)
            const baseColor = new THREE.Color()

            if (normalizedY < 0.25) {
              baseColor.lerpColors(COLORS.darkBlue, COLORS.mediumBlue, normalizedY * 4)
            } else if (normalizedY < 0.5) {
              baseColor.lerpColors(COLORS.mediumBlue, COLORS.tealBlue, (normalizedY - 0.25) * 4)
            } else if (normalizedY < 0.75) {
              baseColor.lerpColors(COLORS.tealBlue, COLORS.teal, (normalizedY - 0.5) * 4)
            } else {
              baseColor.lerpColors(COLORS.teal, COLORS.lightGreen, (normalizedY - 0.75) * 4)
            }

            const categoryColor = new THREE.Color(baseColor)

            switch (trajectory.category) {
              case "education":
                categoryColor.lerp(COLORS.tealBlue, 0.3)
                break
              case "career":
                categoryColor.lerp(COLORS.teal, 0.3)
                break
              case "entrepreneurship":
                categoryColor.lerp(COLORS.lightGreen, 0.3)
                break
              case "health":
                categoryColor.lerp(COLORS.mediumBlue, 0.3)
                break
            }

            const maxScore = Math.max(...trajectory.points.map((p) => p.cumulativeScore))
            const heightFactor = Math.min(2, maxScore / 40) + 0.3

            createGradientOutlineMountain(
              position,
              normal,
              heightFactor,
              parent,
              categoryColor,
              {
                name: trajectory.name,
                type: "trajectory",
                data: trajectory,
              },
              0.8,
              baseMountainWidth,
            )

            createdMountains++
          } catch (error) {
            console.error(`🏗️ ERROR création montagne ${i}:`, error)
          }
        }

        trajectoryIndex = endIndex

        console.log("🏗️ Batch terminé:", {
          createdInBatch: batchSize,
          totalCreated: createdMountains,
          remaining: totalTrajectories - trajectoryIndex,
        })

        if (trajectoryIndex < totalTrajectories && isRendering) {
          setTimeout(createTrajectoryBatch, 0)
        } else {
          console.log("🏗️ addTrajectoryMountains COMPLETE:", {
            totalCreated: createdMountains,
            totalRequested: totalTrajectories,
          })
        }
      }

      createTrajectoryBatch()
    },
    [createGradientOutlineMountain, isRendering],
  )

  const updateMountains = useCallback(
    async (trajectories: LifeTrajectory[], isDirectCodeSearch = false) => {
      console.log("🏗️ updateMountains START:", {
        trajectoriesCount: trajectories?.length || 0,
        isValidArray: Array.isArray(trajectories),
        hasSphereGroup: !!sphereGroupRef.current,
        isRendering,
        isDirectCodeSearch,
      })

      if (!sphereGroupRef.current || !isRendering) {
        console.log("🏗️ updateMountains ABORT: sphère non initialisée")
        return
      }

      if (!trajectories || !Array.isArray(trajectories)) {
        console.error("🏗️ updateMountains ERROR: Trajectoires invalides")
        setFilterError("Données de trajectoires invalides")
        return
      }

      if (trajectories.length < MIN_TRAJECTORIES) {
        console.warn(`🏗️ updateMountains WARNING: Peu de trajectoires (${trajectories.length})`)
        setFilterError(`Peu de résultats (${trajectories.length})`)
      } else {
        setFilterError(null)
      }

      setIsUpdatingMountains(true)
      console.log("🏗️ updateMountains: État de chargement activé")

      try {
        await new Promise((resolve) => setTimeout(resolve, 0))

        let existingMountainsCount = 0
        sphereGroupRef.current.traverse((child) => {
          if (child instanceof THREE.Group && child.userData && child.userData.type === "trajectory") {
            existingMountainsCount++
          }
        })

        console.log("🏗️ updateMountains: Nettoyage", {
          existingMountainsCount,
        })

        clearMountains(sphereGroupRef.current)

        await new Promise((resolve) => setTimeout(resolve, 50))

        console.log("🏗️ updateMountains: Création nouvelles montagnes")

        const radius = 5
        addTrajectoryMountains(sphereGroupRef.current, radius, trajectories, isDirectCodeSearch)

        await new Promise((resolve) => setTimeout(resolve, 100))

        console.log("🏗️ updateMountains SUCCESS: Mise à jour terminée")
      } catch (error) {
        console.error("🏗️ updateMountains ERROR:", error)
        setFilterError("Erreur lors de la mise à jour visuelle")
      } finally {
        setIsUpdatingMountains(false)
        console.log("🏗️ updateMountains: État de chargement désactivé")
      }
    },
    [clearMountains, addTrajectoryMountains, isRendering, setIsUpdatingMountains, setFilterError],
  )

  return {
    updateMountains,
    clearMountains,
    addTrajectoryMountains,
  }
}
