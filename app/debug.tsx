"use client"

import { useState, useEffect } from "react"

export default function DebugPage() {
  const [logs, setLogs] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  const addLog = (message: string) => {
    console.log(message)
    setLogs((prev) => [...prev, `${new Date().toLocaleTimeString()}: ${message}`])
  }

  useEffect(() => {
    addLog("🚀 Debug page mounted")

    // Test des imports
    try {
      addLog("✅ React hooks working")
    } catch (err) {
      setError(`React error: ${err}`)
      addLog(`❌ React error: ${err}`)
    }

    // Test Three.js
    try {
      import("three")
        .then(() => {
          addLog("✅ Three.js import successful")
        })
        .catch((err) => {
          addLog(`❌ Three.js import failed: ${err}`)
        })
    } catch (err) {
      addLog(`❌ Three.js error: ${err}`)
    }

    // Test du store
    try {
      import("@/lib/store")
        .then(() => {
          addLog("✅ Store import successful")
        })
        .catch((err) => {
          addLog(`❌ Store import failed: ${err}`)
        })
    } catch (err) {
      addLog(`❌ Store error: ${err}`)
    }

    // Test API
    fetch("/api/jobtrek/trajectories")
      .then((response) => {
        addLog(`✅ API response: ${response.status}`)
        return response.json()
      })
      .then((data) => {
        addLog(`✅ API data received: ${data?.trajectories?.length || 0} trajectories`)
      })
      .catch((err) => {
        addLog(`❌ API error: ${err.message}`)
      })
  }, [])

  if (error) {
    return (
      <div className="min-h-screen bg-red-900 text-white p-8">
        <h1 className="text-2xl font-bold mb-4">❌ Critical Error</h1>
        <pre className="bg-black p-4 rounded">{error}</pre>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <h1 className="text-2xl font-bold mb-4">🔍 Debug Dashboard</h1>

      <div className="bg-gray-800 p-4 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">System Logs:</h2>
        <div className="space-y-1 max-h-96 overflow-y-auto">
          {logs.map((log, index) => (
            <div key={index} className="text-sm font-mono">
              {log}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gray-800 p-4 rounded-lg">
          <h3 className="font-semibold mb-2">Browser Info:</h3>
          <p>User Agent: {navigator.userAgent}</p>
          <p>
            WebGL Support: {(() => {
              try {
                const canvas = document.createElement("canvas")
                const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl")
                return gl ? "✅ Yes" : "❌ No"
              } catch {
                return "❌ Error"
              }
            })()}
          </p>
        </div>

        <div className="bg-gray-800 p-4 rounded-lg">
          <h3 className="font-semibold mb-2">Quick Actions:</h3>
          <button onClick={() => window.location.reload()} className="bg-blue-600 px-4 py-2 rounded mr-2">
            🔄 Reload Page
          </button>
          <button onClick={() => setLogs([])} className="bg-gray-600 px-4 py-2 rounded">
            🗑️ Clear Logs
          </button>
        </div>
      </div>
    </div>
  )
}
