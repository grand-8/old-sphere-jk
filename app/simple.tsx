"use client"

import { useState, useEffect } from "react"
import { useLifeTrajectoryStore } from "@/lib/store"

export default function SimplePage() {
  const [mounted, setMounted] = useState(false)
  const { filteredTrajectories, isLoading, error, dataSource } = useLifeTrajectoryStore()

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div>🔄 Mounting...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black text-white p-8">
        <h1 className="text-2xl font-bold mb-4">❌ Error</h1>
        <p className="text-red-400">{error}</p>
        <div className="mt-4">
          <button onClick={() => window.location.reload()} className="bg-blue-600 px-4 py-2 rounded">
            Reload
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <h1 className="text-3xl font-bold mb-6">🌟 Life Trajectory Sphere</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gray-800 p-4 rounded-lg">
          <h2 className="text-lg font-semibold mb-2">📊 Data Status</h2>
          <p>
            Source: <span className="text-blue-400">{dataSource}</span>
          </p>
          <p>
            Loading:{" "}
            <span className={isLoading ? "text-yellow-400" : "text-green-400"}>{isLoading ? "Yes" : "No"}</span>
          </p>
          <p>
            Trajectories: <span className="text-green-400">{filteredTrajectories.length}</span>
          </p>
        </div>

        <div className="bg-gray-800 p-4 rounded-lg">
          <h2 className="text-lg font-semibold mb-2">🎮 Controls</h2>
          <button
            onClick={() => (window.location.href = "/debug")}
            className="bg-yellow-600 px-3 py-1 rounded text-sm mr-2"
          >
            Debug Mode
          </button>
          <button onClick={() => (window.location.href = "/")} className="bg-green-600 px-3 py-1 rounded text-sm">
            Full App
          </button>
        </div>

        <div className="bg-gray-800 p-4 rounded-lg">
          <h2 className="text-lg font-semibold mb-2">ℹ️ Info</h2>
          <p className="text-sm text-gray-400">This is a simplified version to test basic functionality.</p>
        </div>
      </div>

      {filteredTrajectories.length > 0 && (
        <div className="bg-gray-800 p-4 rounded-lg">
          <h2 className="text-lg font-semibold mb-4">📋 Sample Data</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTrajectories.slice(0, 6).map((trajectory) => (
              <div key={trajectory.id} className="bg-gray-700 p-3 rounded">
                <h3 className="font-semibold text-blue-400">{trajectory.userCode || trajectory.id.substring(0, 4)}</h3>
                <p className="text-sm text-gray-300">{trajectory.name}</p>
                <p className="text-xs text-gray-400">{trajectory.points?.length || 0} points</p>
                <p className="text-xs text-gray-400">Type: {trajectory.typeMesure || "N/A"}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
