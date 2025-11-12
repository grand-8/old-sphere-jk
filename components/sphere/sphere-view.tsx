"use client"

import { useEffect } from "react"
import GradientOutlineSphere from "@/components/sphere/gradient-outline-sphere"
import { useLifeTrajectoryStore } from "@/lib/store"

/**
 * Container component for the 3D sphere visualization
 * Wraps the existing GradientOutlineSphere component
 */
export function SphereView() {
  const { setSphereCameraPosition } = useLifeTrajectoryStore()

  useEffect(() => {
    console.log("[v0] SphereView mounted")

    return () => {
      console.log("[v0] SphereView unmounting - THREE.js will stop rendering")
      // Camera position will be saved by GradientOutlineSphere before this unmounts
    }
  }, [])

  return (
    <div className="w-full h-full">
      <GradientOutlineSphere />
    </div>
  )
}
