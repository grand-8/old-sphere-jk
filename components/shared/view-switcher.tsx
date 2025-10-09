"use client"

import type React from "react"

import { useLifeTrajectoryStore, type ViewType } from "@/lib/store"
import { Globe, TrendingUp } from "lucide-react"

interface ViewSwitcherProps {
  className?: string
  isIntroAnimationPlaying?: boolean
}

export function ViewSwitcher({ className, isIntroAnimationPlaying = false }: ViewSwitcherProps) {
  const { currentView, setCurrentView } = useLifeTrajectoryStore()

  const handleViewChange = (view: ViewType) => {
    console.log(`[v0] Switching to ${view} view`)
    setCurrentView(view)
  }

  const visibilityClasses = isIntroAnimationPlaying
    ? "opacity-0 pointer-events-none"
    : "opacity-100 pointer-events-auto"

  const transitionClasses = "transition-all duration-700 ease-out"

  const handleUIEvent = (e: React.MouseEvent) => {
    e.stopPropagation()
  }

  return (
    <div
      className={`flex items-center gap-2 ${visibilityClasses} ${transitionClasses} ${className}`}
      style={{
        isolation: "isolate",
        WebkitTransform: "translateZ(0)",
        transform: "translateZ(0)",
        willChange: "transform",
      }}
      data-ui-element="true"
    >
      <button
        onClick={() => handleViewChange("sphere")}
        onMouseDown={handleUIEvent}
        onMouseMove={handleUIEvent}
        className={`w-10 h-10 transition-colors rounded-full border shadow-lg flex items-center justify-center ${
          currentView === "sphere"
            ? "bg-white text-black border-white"
            : "bg-black/50 text-white border-white/20 hover:border-white/40"
        }`}
        style={{
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          WebkitTransform: "translateZ(0)",
          transform: "translateZ(0)",
        }}
        aria-label="Vue sphère"
        data-ui-element="true"
      >
        <Globe size={16} />
      </button>
      <button
        onClick={() => handleViewChange("linear")}
        onMouseDown={handleUIEvent}
        onMouseMove={handleUIEvent}
        className={`w-10 h-10 transition-colors rounded-full border shadow-lg flex items-center justify-center ${
          currentView === "linear"
            ? "bg-white text-black border-white"
            : "bg-black/50 text-white border-white/20 hover:border-white/40"
        }`}
        style={{
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          WebkitTransform: "translateZ(0)",
          transform: "translateZ(0)",
        }}
        aria-label="Vue linéaire"
        data-ui-element="true"
      >
        <TrendingUp size={16} />
      </button>
    </div>
  )
}
