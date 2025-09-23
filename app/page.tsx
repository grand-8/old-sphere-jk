"use client"

import { Suspense, useState, useEffect } from "react"
import { ThemeLoader } from "@/components/ui/theme-loader"
import { useLifeTrajectoryStore } from "@/lib/store"
import { ViewSwitcher } from "@/components/shared/view-switcher"
import { SphereView } from "@/components/sphere/sphere-view"
import { LinearView } from "@/components/linear/linear-view"

export default function Home() {
  const [hasError, setHasError] = useState(false)
  const [mounted, setMounted] = useState(false)
  const { currentView, isIntroAnimationPlaying } = useLifeTrajectoryStore()

  useEffect(() => {
    setMounted(true)

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
            <button onClick={() => window.location.reload()} className="bg-green-600 px-4 py-2 rounded">
              🔄 Reload
            </button>
            <button onClick={() => (window.location.href = "/simple")} className="bg-blue-600 px-4 py-2 rounded">
              Simple Mode
            </button>
            <button onClick={() => (window.location.href = "/debug")} className="bg-yellow-600 px-4 py-2 rounded">
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
          className={`absolute bottom-20 left-0 right-0 text-center text-white z-40 ${titleVisibilityClasses} ${titleTransitionClasses}`}
          style={{ isolation: "isolate" }}
        >
          <h2 className="text-5xl md:text-7xl font-bold leading-tight">Trajectoires de vie</h2>
          <p className="text-gray-400 text-lg md:text-xl mt-4">Chaque parcours est une pièce de notre économie.</p>
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

      <Suspense fallback={<ThemeLoader />}>{currentView === "sphere" ? <SphereView /> : <LinearView />}</Suspense>
    </main>
  )
}
