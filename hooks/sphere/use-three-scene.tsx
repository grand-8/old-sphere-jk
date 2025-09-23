"use client"

import type React from "react"
import { useRef, useEffect, useState } from "react"
import * as THREE from "three"
import { OrbitControls } from "three/addons/controls/OrbitControls.js"

const COLORS = {
  darkBlue: new THREE.Color("#1a2b4d"),
  mediumBlue: new THREE.Color("#2d4b6e"),
  tealBlue: new THREE.Color("#3d6b7c"),
  teal: new THREE.Color("#4d8a7a"),
  lightGreen: new THREE.Color("#7ab555"),
  highlight: new THREE.Color("#ffffff"),
}

const CAMERA_POSITIONS = {
  DEFAULT: 7,
  CENTER: 0,
}

export function useThreeScene(containerRef: React.RefObject<HTMLDivElement>): UseThreeSceneReturn {
  const sceneRef = useRef<THREE.Scene | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  const sphereGroupRef = useRef<THREE.Group | null>(null)
  const animationFrameRef = useRef<number | null>(null)

  const [isRendering, setIsRendering] = useState(true)
  const [controlsInitialized, setControlsInitialized] = useState(false)

  useEffect(() => {
    if (!containerRef.current || typeof window === "undefined") return

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x000000)
    sceneRef.current = scene

    const aspectRatio = typeof window !== "undefined" ? window.innerWidth / window.innerHeight : 16 / 9
    const camera = new THREE.PerspectiveCamera(45, aspectRatio, 0.1, 1000)
    camera.position.z = CAMERA_POSITIONS.DEFAULT
    cameraRef.current = camera

    let renderer: THREE.WebGLRenderer

    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      })

      if (typeof window !== "undefined") {
        renderer.setSize(window.innerWidth, window.innerHeight)
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      } else {
        renderer.setSize(1920, 1080) // Fallback size for SSR
        renderer.setPixelRatio(1)
      }

      containerRef.current.appendChild(renderer.domElement)
      rendererRef.current = renderer
    } catch (error) {
      console.error("Erreur lors de la création du renderer WebGL:", error)

      if (containerRef.current) {
        const errorMessage = document.createElement("div")
        errorMessage.className = "flex items-center justify-center w-full h-screen bg-black text-white text-center p-4"
        errorMessage.innerHTML = `
          <div>
            <h2 class="text-xl font-bold mb-2">Erreur de rendu 3D</h2>
            <p>Votre navigateur ne semble pas prendre en charge WebGL correctement.</p>
            <p class="mt-2">Essayez d'utiliser un navigateur plus récent ou de vérifier vos paramètres graphiques.</p>
          </div>
        `
        containerRef.current.appendChild(errorMessage)
      }

      return
    }

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4)
    scene.add(ambientLight)

    const pointLight1 = new THREE.PointLight(0xffffff, 1)
    pointLight1.position.set(10, 10, 10)
    scene.add(pointLight1)

    const sphereGroup = new THREE.Group()
    scene.add(sphereGroup)
    sphereGroupRef.current = sphereGroup

    const sphereGeometry = new THREE.SphereGeometry(5, 32, 32)
    const sphereEdges = new THREE.EdgesGeometry(sphereGeometry)

    const sphereColors = new Float32Array(sphereEdges.attributes.position.count * 3)

    for (let i = 0; i < sphereEdges.attributes.position.count; i++) {
      const vertex = new THREE.Vector3()
      vertex.fromBufferAttribute(sphereEdges.attributes.position, i)

      const normalizedY = (vertex.y + 5) / 10

      const color = new THREE.Color()

      if (normalizedY < 0.25) {
        color.lerpColors(COLORS.darkBlue, COLORS.mediumBlue, normalizedY * 4)
      } else if (normalizedY < 0.5) {
        color.lerpColors(COLORS.mediumBlue, COLORS.tealBlue, (normalizedY - 0.25) * 4)
      } else if (normalizedY < 0.75) {
        color.lerpColors(COLORS.tealBlue, COLORS.teal, (normalizedY - 0.5) * 4)
      } else {
        color.lerpColors(COLORS.teal, COLORS.lightGreen, (normalizedY - 0.75) * 4)
      }

      sphereColors[i * 3] = color.r
      sphereColors[i * 3 + 1] = color.g
      sphereColors[i * 3 + 2] = color.b
    }

    sphereEdges.setAttribute("color", new THREE.BufferAttribute(sphereColors, 3))

    const sphereMaterial = new THREE.LineBasicMaterial({
      vertexColors: true,
      opacity: 0.3,
      transparent: true,
    })

    const sphereWireframe = new THREE.LineSegments(sphereEdges, sphereMaterial)
    sphereGroup.add(sphereWireframe)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enablePan = false
    controls.minDistance = 0.1
    controls.maxDistance = 20
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controlsRef.current = controls

    // Marquer les contrôles comme initialisés
    setControlsInitialized(true)

    const animate = () => {
      if (!isRendering) return

      animationFrameRef.current = requestAnimationFrame(animate)

      try {
        // Note: controlsEnabled sera géré dans le composant principal
        if (sphereGroupRef.current) {
          sphereGroupRef.current.rotation.y += 0.001
        }

        controls.update()
        renderer.render(scene, camera)
      } catch (error) {
        console.error("Erreur pendant l'animation:", error)
      }
    }

    animate()

    const handleResize = () => {
      try {
        if (cameraRef.current && rendererRef.current && typeof window !== "undefined") {
          cameraRef.current.aspect = window.innerWidth / window.innerHeight
          cameraRef.current.updateProjectionMatrix()
          rendererRef.current.setSize(window.innerWidth, window.innerHeight)
        }
      } catch (error) {
        console.error("Erreur lors du redimensionnement:", error)
      }
    }

    if (typeof window !== "undefined") {
      window.addEventListener("resize", handleResize)
    }

    return () => {
      setIsRendering(false)
      setControlsInitialized(false)

      if (typeof window !== "undefined") {
        window.removeEventListener("resize", handleResize)
      }

      if (containerRef.current && rendererRef.current) {
        try {
          containerRef.current.removeChild(rendererRef.current.domElement)
        } catch (error) {
          console.warn("Erreur lors de la suppression du renderer du DOM:", error)
        }
      }

      if (rendererRef.current) {
        rendererRef.current.dispose()
      }

      if (controlsRef.current) {
        controlsRef.current.dispose()
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
  }, [containerRef, isRendering])

  return {
    sceneRef,
    rendererRef,
    cameraRef,
    controlsRef,
    sphereGroupRef,
    isRendering,
    setIsRendering,
    controlsInitialized,
  }
}

// Ajouter cette interface à la fin du fichier, juste avant l'export
export interface UseThreeSceneReturn {
  sceneRef: React.MutableRefObject<THREE.Scene | null>
  rendererRef: React.MutableRefObject<THREE.WebGLRenderer | null>
  cameraRef: React.MutableRefObject<THREE.PerspectiveCamera | null>
  controlsRef: React.MutableRefObject<OrbitControls | null>
  sphereGroupRef: React.MutableRefObject<THREE.Group | null>
  isRendering: boolean
  setIsRendering: (value: boolean) => void
  controlsInitialized: boolean
}
