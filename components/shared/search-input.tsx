"use client"

import type React from "react"
import { Search, X } from "lucide-react"
import { useState, useEffect } from "react"
import { useLifeTrajectoryStore } from "@/lib/store"

interface SearchInputProps {
  placeholder?: string
  onMouseDown?: (e: React.MouseEvent) => void
  onMouseMove?: (e: React.MouseEvent) => void
  onExpandChange?: (expanded: boolean) => void
}

export function SearchInput({
  placeholder = "Rechercher...",
  onMouseDown,
  onMouseMove,
  onExpandChange,
}: SearchInputProps) {
  const [value, setValue] = useState("")
  const [isExpanded, setIsExpanded] = useState(false)
  const { setSearchQuery } = useLifeTrajectoryStore()

  useEffect(() => {
    onExpandChange?.(isExpanded)
  }, [isExpanded, onExpandChange])

  useEffect(() => {
    if (!value && !document.activeElement?.closest("[data-search-input]")) {
      const timer = setTimeout(() => setIsExpanded(false), 200)
      return () => clearTimeout(timer)
    }
  }, [value])

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setSearchQuery(value)
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [value, setSearchQuery])

  const handleUIEvent = (e: React.MouseEvent | React.FocusEvent) => {
    e.stopPropagation()
  }

  const handleButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsExpanded(true)
  }

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation()
    setValue("")
    setIsExpanded(false)
  }

  return (
    <div
      className="relative"
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      style={{ isolation: "isolate" }}
      data-ui-element="true"
      data-search-input
    >
      <div className="relative flex items-center">
        <button
          onClick={handleButtonClick}
          onMouseDown={handleUIEvent}
          className={`
            md:hidden w-10 h-10 
            bg-black/50 backdrop-blur-sm 
            border border-white/20 
            rounded-full 
            text-white
            hover:bg-black/60
            hover:border-white/40
            transition-all duration-200
            flex items-center justify-center
            ${isExpanded ? "hidden" : "flex"}
          `}
          aria-label="Rechercher"
          data-ui-element="true"
        >
          <Search size={20} strokeWidth={1.5} />
        </button>

        <div className={`relative ${isExpanded ? "flex" : "hidden md:flex"} items-center`}>
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            onMouseDown={handleUIEvent}
            onMouseMove={handleUIEvent}
            onClick={handleUIEvent}
            onFocus={handleUIEvent}
            onBlur={() => {
              if (!value) {
                setTimeout(() => setIsExpanded(false), 200)
              }
            }}
            data-ui-element="true"
            className={`
              h-10 pl-11 pr-11
              bg-black/50 backdrop-blur-sm 
              border border-white/20 
              rounded-full 
              text-white text-sm 
              placeholder-gray-400 
              focus:outline-none 
              focus:border-white/40 
              focus:bg-black/60
              transition-all duration-200
              hover:bg-black/60
              hover:border-white/40
              w-64
            `}
          />
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none z-10">
            <Search className="text-gray-300" size={20} strokeWidth={1.5} />
          </div>

          {isExpanded && (
            <button
              onClick={handleClose}
              onMouseDown={handleUIEvent}
              className="md:hidden absolute right-3 top-1/2 transform -translate-y-1/2 z-10 text-gray-300 hover:text-white transition-colors"
              aria-label="Fermer la recherche"
              data-ui-element="true"
            >
              <X size={20} strokeWidth={1.5} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
