"use client"

import type React from "react"
import { RefreshCw } from "lucide-react"
import { SearchInput } from "@/components/search-input"
import { Counter } from "@/components/counter"
import { StatisticsButton } from "@/components/statistics-button"

interface UIControlsProps {
  handleUIEvent: (e: React.MouseEvent) => void
  handleRefresh: (e: React.MouseEvent) => void
  isZoomedIn: boolean
  isLoading: boolean
  setControlsEnabled: (enabled: boolean) => void
  performZoom: (zoomIn: boolean, onComplete?: () => void) => void
  onStatisticsClick?: () => void
}

export function UIControls({
  handleUIEvent,
  handleRefresh,
  isZoomedIn,
  isLoading,
  setControlsEnabled,
  performZoom,
  onStatisticsClick,
}: UIControlsProps) {
  return (
    <div className="fixed inset-0 pointer-events-none">
      {/* Compteur en haut à gauche */}
      <div className="absolute top-4 left-4 pointer-events-auto z-50" style={{ isolation: "isolate" }}>
        <Counter />
      </div>

      {/* Contrôles en haut à droite */}
      <div
        className="absolute top-4 right-4 flex items-center gap-3 pointer-events-auto"
        style={{ isolation: "isolate" }}
        data-ui-element="true"
      >
        {onStatisticsClick && (
          <StatisticsButton onClick={onStatisticsClick} onMouseDown={handleUIEvent} onMouseMove={handleUIEvent} />
        )}

        <SearchInput onMouseDown={handleUIEvent} onMouseMove={handleUIEvent} />

        <button
          onClick={handleRefresh}
          onMouseDown={handleUIEvent}
          onMouseMove={handleUIEvent}
          disabled={isLoading}
          className="w-10 h-10 bg-black/50 backdrop-blur-sm text-white rounded-full hover:bg-black/60 transition-colors shadow-lg border border-white/20 flex items-center justify-center disabled:opacity-50"
          aria-label="Actualiser les données"
          data-ui-element="true"
        >
          <RefreshCw size={20} className={isLoading ? "animate-spin" : ""} />
        </button>
      </div>
    </div>
  )
}
