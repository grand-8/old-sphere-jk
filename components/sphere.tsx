"use client"

import { useRef } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"

const Sphere = () => {
  const sphereGroupRef = useRef<THREE.Group>(null)
  const isUpdatingMountains = false

  useFrame((state) => {
    if (sphereGroupRef.current && !isUpdatingMountains) {
      // Rotation globale de la sphère
      sphereGroupRef.current.rotation.y += 0.002

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

          // Log first few rotations to verify it's working
          if (rotatingPeaksCount <= 3) {
            console.log(`[v0] Rotating peak ${rotatingPeaksCount}:`, {
              axis: rotationAxis,
              speed: rotationSpeed,
              currentRotation: {
                x: child.rotation.x.toFixed(3),
                y: child.rotation.y.toFixed(3),
                z: child.rotation.z.toFixed(3),
              },
            })
          }

          // Appliquer la rotation selon l'axe défini
          if (rotationAxis === "x") {
            child.rotation.x += rotationSpeed
          } else if (rotationAxis === "y") {
            child.rotation.y += rotationSpeed
          } else if (rotationAxis === "z") {
            child.rotation.z += rotationSpeed
          }
        }
      })

      // Log total count every 60 frames (about once per second at 60fps)
      if (Math.floor(state.clock.elapsedTime) % 2 === 0 && state.clock.elapsedTime % 1 < 0.016) {
        console.log(`[v0] Total rotating peaks found: ${rotatingPeaksCount}`)
      }
    }
  })

  // ... rest of code here ...

  return <group ref={sphereGroupRef}>{/* ... other components here ... */}</group>
}

export default Sphere
