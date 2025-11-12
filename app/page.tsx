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
  const [hasProcessedUrlParam, setHasProcessedUrlParam] = useState(false)
  const { currentView, isIntroAnimationPlaying, trajectoryData, isLoading, setSelectedPerson, selectedPerson } =
    useLifeTrajectoryStore()

  useEffect(() => {
    console.log("[v0] URL Param Effect - State:", {
      isLoading,
      trajectoryDataLength: trajectoryData.length,
      hasProcessedUrlParam,
      selectedPerson: selectedPerson?.userCode || null,
    })

    // Wait for data to be loaded and avoid reprocessing
    if (typeof window === "undefined" || isLoading || trajectoryData.length === 0 || hasProcessedUrlParam) {
      console.log("[v0] Skipping URL processing:", {
        isServer: typeof window === "undefined",
        isLoading,
        noData: trajectoryData.length === 0,
        alreadyProcessed: hasProcessedUrlParam,
      })
      return
    }

    const params = new URLSearchParams(window.location.search)
    const trajectoryCode = params.get("trajectory") || params.get("t")

    console.log("[v0] URL params:", { trajectoryCode, fullURL: window.location.href })

    if (trajectoryCode) {
      console.log("[v0] Processing trajectory from URL:", trajectoryCode)
      const trajectory = trajectoryData.find((t) => t.userCode === trajectoryCode)

      console.log("[v0] Trajectory search result:", {
        found: !!trajectory,
        trajectoryId: trajectory?.id,
        trajectoryCode: trajectory?.userCode,
        totalTrajectories: trajectoryData.length,
      })

      if (trajectory) {
        console.log("[v0] Calling setSelectedPerson with trajectory object")
        setSelectedPerson(trajectory)
        setHasProcessedUrlParam(true)

        // Verify the state was updated
        setTimeout(() => {
          const currentState = useLifeTrajectoryStore.getState()
          console.log("[v0] State after setSelectedPerson:", {
            selectedPersonCode: currentState.selectedPerson?.userCode || null,
            selectedPersonType: typeof currentState.selectedPerson,
            hasId: currentState.selectedPerson?.id ? "yes" : "no",
          })
        }, 100)
      } else {
        console.warn("[v0] Trajectory not found:", trajectoryCode)
        console.log("[v0] Available trajectories:", trajectoryData.map((t) => t.userCode).slice(0, 10))
        // Only clean up URL if data is fully loaded and trajectory still not found
        if (!isLoading && trajectoryData.length > 0) {
          window.history.replaceState({}, "", "/")
          setHasProcessedUrlParam(true)
        }
      }
    } else {
      console.log("[v0] No trajectory parameter in URL")
      // No trajectory parameter, mark as processed
      setHasProcessedUrlParam(true)
    }
  }, [isLoading, trajectoryData, setSelectedPerson, hasProcessedUrlParam])

  useEffect(() => {
    console.log("[v0] selectedPerson changed:", selectedPerson?.userCode || null)
  }, [selectedPerson])

  useEffect(() => {
    if (typeof window === "undefined") return

    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search)
      const trajectoryCode = params.get("trajectory") || params.get("t")

      console.log("[v0] PopState event:", { trajectoryCode })

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
    <main className="relative w-full h-screen-ios bg-black overflow-hidden">
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
        <div className="absolute top-2 left-2 text-xs text-gray-500 bg-black/50 p-2 rounded z-50">
          <div>Mode: {process.env.NODE_ENV}</div>
          <div>Vue: {currentView}</div>
          <div>Mounted: ✅</div>
          <div>Selected: {selectedPerson?.userCode || "none"}</div>
          <div>Loading: {isLoading ? "yes" : "no"}</div>
          <div>Data: {trajectoryData.length}</div>
        </div>
      )}

      <div className="absolute bottom-8 md:bottom-4 right-4 md:right-4 z-50 pb-safe">
        <ViewSwitcher isIntroAnimationPlaying={isIntroAnimationPlaying} />
      </div>

      <div
        className="absolute bottom-8 md:bottom-4 left-4 z-50 text-white/60 text-xs hover:text-white/80 transition-colors pb-safe"
        style={{
          WebkitTransform: "translateZ(0)",
          transform: "translateZ(0)",
          willChange: "transform",
        }}
      >
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

      {currentView === "sphere" && <SphereView />}
      {currentView === "linear" && <LinearView />}
    </main>
  )
}
