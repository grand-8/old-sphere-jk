"use client"

import { Suspense, useState, useEffect } from "react"
import dynamic from "next/dynamic"
import { ThemeLoader } from "@/components/ui/theme-loader"

// Import dynamique avec gestion d'erreur
const GradientOutlineSphere = dynamic(
  () =>
    import("@/components/gradient-outline-sphere").catch((err) => {
      console.error("❌ Failed to load GradientOutlineSphere:", err)
      return () => (
        <div className="min-h-screen bg-black text-white flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">❌ Loading Error</h2>
            <p className="text-gray-400 mb-4">Failed to load 3D visualization</p>
            <button onClick={() => (window.location.href = "/simple")} className="bg-blue-600 px-4 py-2 rounded mr-2">
              Try Simple Mode
            </button>
            <button onClick={() => (window.location.href = "/debug")} className="bg-yellow-600 px-4 py-2 rounded">
              Debug Mode
            </button>
          </div>
        </div>
      )
    }),
  {
    ssr: false,
    loading: () => <ThemeLoader />,
  },
)

export default function Home() {
  const [hasError, setHasError] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)

    // Vérifier WebGL
    try {
      const canvas = document.createElement("canvas")
      const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl")
      if (!gl) {
        console.warn("⚠️ WebGL not supported")
      }
    } catch (err) {
      console.error("❌ WebGL check failed:", err)
      setHasError(true)
    }

    // Gestionnaire d'erreur global
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

  return (
    <main className="relative w-full h-screen bg-black overflow-hidden">
      <Suspense fallback={<ThemeLoader />}>
        <GradientOutlineSphere />
      </Suspense>

      {/* Texte central */}
      <div className="absolute bottom-20 left-0 right-0 text-center text-white pointer-events-none">
        <h2 className="text-5xl md:text-7xl font-bold leading-tight">Trajectoires de vie</h2>
        <p className="text-gray-400 text-lg md:text-xl mt-4">Chaque parcours est une pièce de notre économie.</p>
      </div>

      {/* Debug info en développement */}
      {process.env.NODE_ENV === "development" && (
        <div className="absolute top-2 left-2 text-xs text-gray-500 bg-black/50 p-2 rounded">
          <div>Mode: {process.env.NODE_ENV}</div>
          <div>Mounted: ✅</div>
        </div>
      )}
    </main>
  )
}
