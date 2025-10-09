"use client"

import { useState, useEffect } from "react"
import dynamic from "next/dynamic"
import { ThemeLoader } from "@/components/ui/theme-loader"
import { useLifeTrajectoryStore } from "@/lib/store"
import { ViewSwitcher } from "@/components/shared/view-switcher"

const SphereView = dynamic(
  () => import("@/components/sphere/sphere-view").then((mod) => ({ default: mod.SphereView })),
  {
    ssr: false,
    loading: () => <ThemeLoader />,
  },
)

const LinearView = dynamic(
  () => import("@/components/linear/linear-view").then((mod) => ({ default: mod.LinearView })),
  {
    ssr: false,
    loading: () => <ThemeLoader />,
  },
)

export default function Home() {
  const [hasError, setHasError] = useState(false)
  const [mounted, setMounted] = useState(false)
  const { currentView, isIntroAnimationPlaying, trajectoryData, isLoading, setSelectedPerson } =
    useLifeTrajectoryStore()

  useEffect(() => {
    if (typeof window === "undefined" || isLoading || trajectoryData.length === 0) return

    const params = new URLSearchParams(window.location.search)
    const trajectoryCode = params.get("trajectory") || params.get("t")

    if (trajectoryCode) {
      const trajectory = trajectoryData.find((t) => t.userCode === trajectoryCode)

      if (trajectory) {
        console.log("[v0] Opening trajectory from URL:", trajectoryCode)
        setSelectedPerson(trajectory)
      } else {
        console.warn("[v0] Trajectory not found:", trajectoryCode)
        // Clean up invalid URL parameter
        window.history.replaceState({}, "", "/")
      }
    }
  }, [isLoading, trajectoryData, setSelectedPerson])

  useEffect(() => {
    if (typeof window === "undefined") return

    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search)
      const trajectoryCode = params.get("trajectory") || params.get("t")

      if (!trajectoryCode) {
        // Close modal when navigating back to root URL
        setSelectedPerson(null)
      } else {
        // Open modal when navigating forward to trajectory URL
        const trajectory = trajectoryData.find((t) => t.userCode === trajectoryCode)
        if (trajectory) {
          setSelectedPerson(trajectory)
        }
      }
    }

    window.addEventListener("popstate", handlePopState)
    return () => window.removeEventListener("popstate", handlePopState)
  }, [trajectoryData, setSelectedPerson])

  useEffect(() => {
    setMounted(true)

    if (typeof window === "undefined") return

    const handleError = (event: ErrorEvent) => {
      console.error("❌ Global error:", event.error)
      setHasError(true)
    }

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error("❌ Unhandled promise rejection:", event.reason)
      setHasError(true)
    }

    window.addEventListener("error", handleError)
    window.addEventListener("unhandledrejection", handleUnhandledRejection)

    return () => {
      window.removeEventListener("error", handleError)
      window.removeEventListener("unhandledrejection", handleUnhandledRejection)
    }
  }, [])

  if (!mounted) {
    return <ThemeLoader />
  }

  if (hasError) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">❌ Application Error</h2>
          <p className="text-gray-400 mb-4">Something went wrong</p>
          <div className="space-x-2">
            <button
              onClick={() => typeof window !== "undefined" && window.location.reload()}
              className="bg-green-600 px-4 py-2 rounded"
            >
              🔄 Reload
            </button>
            <button
              onClick={() => typeof window !== "undefined" && (window.location.href = "/simple")}
              className="bg-blue-600 px-4 py-2 rounded"
            >
              Simple Mode
            </button>
            <button
              onClick={() => typeof window !== "undefined" && (window.location.href = "/debug")}
              className="bg-yellow-600 px-4 py-2 rounded"
            >
              Debug Mode
            </button>
          </div>
        </div>
      </div>
    )
  }

  const titleVisibilityClasses = isIntroAnimationPlaying
    ? "opacity-0 pointer-events-none"
    : "opacity-100 pointer-events-auto"

  const titleTransitionClasses = "transition-all duration-700 ease-out"

  return (
    <main className="relative w-full h-screen bg-black overflow-hidden">
      {currentView === "sphere" && (
        <div
          className={`absolute bottom-32 md:bottom-20 left-0 right-0 text-center text-white z-40 px-4 ${titleVisibilityClasses} ${titleTransitionClasses}`}
          style={{ isolation: "isolate" }}
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-bold leading-tight">Trajectoires de vie</h2>
          <p className="text-gray-400 text-sm sm:text-base md:text-lg lg:text-xl mt-2 md:mt-4">
            Chaque parcours est une pièce de notre économie.
          </p>
        </div>
      )}

      {process.env.NODE_ENV === "development" && (
        <div className="absolute top-2 left-2 text-xs text-gray-500 bg-black/50 p-2 rounded">
          <div>Mode: {process.env.NODE_ENV}</div>
          <div>Vue: {currentView}</div>
          <div>Mounted: ✅</div>
        </div>
      )}

      <div className="absolute bottom-4 right-4 z-50">
        <ViewSwitcher isIntroAnimationPlaying={isIntroAnimationPlaying} />
      </div>

      <div className="absolute bottom-4 left-4 z-50 text-white/60 text-xs hover:text-white/80 transition-colors">
        by :{" "}
        <a
          href="https://therise.ch"
          target="_blank"
          rel="noopener noreferrer"
          className="underline decoration-white/30 hover:decoration-white/60 transition-all"
        >
          rise
        </a>
      </div>

      {currentView === "sphere" ? <SphereView /> : <LinearView />}
    </main>
  )
}
