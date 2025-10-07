"use client"

import { useRef } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"

const Sphere = () => {
  const sphereGroupRef = useRef<THREE.Group>(null)
  const isUpdatingMountains = false
  const frameCountRef = useRef(0)

  useFrame((state) => {
    if (sphereGroupRef.current && !isUpdatingMountains) {
      // Rotation globale de la sphère
      sphereGroupRef.current.rotation.y += 0.002

      frameCountRef.current++
      const shouldUpdateRotation = frameCountRef.current % 2 === 0

      if (shouldUpdateRotation) {
        let rotatingPeaksCount = 0
        sphereGroupRef.current.traverse((child) => {
          // Chercher les groupes de rotation individuels qui ont les propriétés de rotation
          if (
            child instanceof THREE.Group &&
            child.userData &&
            child.userData.isRotatingPeak &&
            child.userData.rotationSpeed &&
            child.userData.rotationAxis
          ) {
            rotatingPeaksCount++
            const { rotationSpeed, rotationAxis } = child.userData

            const adjustedSpeed = rotationSpeed * 2

            // Appliquer la rotation selon l'axe défini
            if (rotationAxis === "x") {
              child.rotation.x += adjustedSpeed
            } else if (rotationAxis === "y") {
              child.rotation.y += adjustedSpeed
            } else if (rotationAxis === "z") {
              child.rotation.z += adjustedSpeed
            }
          }
        })

        // Log total count every 60 frames (about once per second at 60fps)
        if (Math.floor(state.clock.elapsedTime) % 2 === 0 && state.clock.elapsedTime % 1 < 0.016) {
          console.log(`[v0] Total rotating peaks found: ${rotatingPeaksCount}`)
        }
      }
    }
  })

  // ... rest of code here ...

  return <group ref={sphereGroupRef}>{/* ... other components here ... */}</group>
}

export default Sphere
