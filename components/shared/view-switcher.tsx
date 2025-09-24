"use client"

import type React from "react"

import { useLifeTrajectoryStore, type ViewType } from "@/lib/store"

interface ViewSwitcherProps {
  className?: string
  isIntroAnimationPlaying?: boolean
}

const GlobeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
)

const TrendingUpIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
    <polyline points="17 6 23 6 23 12" />
  </svg>
)

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
      style={{ isolation: "isolate" }}
      data-ui-element="true"
    >
      <button
        onClick={() => handleViewChange("sphere")}
        onMouseDown={handleUIEvent}
        onMouseMove={handleUIEvent}
        className={`w-10 h-10 backdrop-blur-sm transition-colors rounded-full border shadow-lg flex items-center justify-center ${
          currentView === "sphere"
            ? "bg-white text-black border-white"
            : "bg-black/50 text-white border-white/20 hover:border-white/40"
        }`}
        aria-label="Vue sphère"
        data-ui-element="true"
      >
        <GlobeIcon />
      </button>
      <button
        onClick={() => handleViewChange("linear")}
        onMouseDown={handleUIEvent}
        onMouseMove={handleUIEvent}
        className={`w-10 h-10 backdrop-blur-sm transition-colors rounded-full border shadow-lg flex items-center justify-center ${
          currentView === "linear"
            ? "bg-white text-black border-white"
            : "bg-black/50 text-white border-white/20 hover:border-white/40"
        }`}
        aria-label="Vue linéaire"
        data-ui-element="true"
      >
        <TrendingUpIcon />
      </button>
    </div>
  )
}
