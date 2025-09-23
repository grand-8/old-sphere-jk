"use client"

import GradientOutlineSphere from "@/components/sphere/gradient-outline-sphere"

/**
 * Container component for the 3D sphere visualization
 * Wraps the existing GradientOutlineSphere component
 */
export function SphereView() {
  console.log("[v0] Rendering SphereView")

  return (
    <div className="w-full h-full">
      <GradientOutlineSphere />
    </div>
  )
}
