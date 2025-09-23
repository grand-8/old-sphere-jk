"use client"

import type React from "react"
import { BarChart3 } from "lucide-react"

interface StatisticsButtonProps {
  onClick: () => void
  onMouseDown: (e: React.MouseEvent) => void
  onMouseMove: (e: React.MouseEvent) => void
}

export function StatisticsButton({ onClick, onMouseDown, onMouseMove }: StatisticsButtonProps) {
  return (
    <button
      onClick={onClick}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      className="w-10 h-10 bg-black/50 backdrop-blur-sm text-white rounded-full hover:bg-black/60 transition-colors shadow-lg border border-white/20 flex items-center justify-center"
      aria-label="Voir les statistiques"
      data-ui-element="true"
    >
      <BarChart3 size={20} />
    </button>
  )
}
