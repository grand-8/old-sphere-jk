"use client"

import { useEffect, useState } from "react"

export function ThemeLoader() {
  const [rotation, setRotation] = useState(0)

  useEffect(() => {
    let animationFrame: number
    let lastTime = 0

    const animate = (time: number) => {
      if (lastTime === 0) {
        lastTime = time
      }

      const delta = time - lastTime
      lastTime = time

      setRotation((prev) => (prev + delta * 0.1) % 360)
      animationFrame = requestAnimationFrame(animate)
    }

    animationFrame = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(animationFrame)
    }
  }, [])

  // Couleurs correspondant au thème des peaks
  const gradientColors = [
    { offset: "0%", color: "#1a2b4d" }, // darkBlue
    { offset: "25%", color: "#2d4b6e" }, // mediumBlue
    { offset: "50%", color: "#3d6b7c" }, // tealBlue
    { offset: "75%", color: "#4d8a7a" }, // teal
    { offset: "100%", color: "#7ab555" }, // lightGreen
  ]

  return (
    <div className="flex items-center justify-center w-full h-screen bg-black">
      <svg width="80" height="80" viewBox="0 0 80 80">
        <defs>
          <linearGradient id="loaderGradient" gradientTransform={`rotate(${rotation}, 40, 40)`}>
            {gradientColors.map((stop, index) => (
              <stop key={index} offset={stop.offset} stopColor={stop.color} />
            ))}
          </linearGradient>
        </defs>
        <circle
          cx="40"
          cy="40"
          r="36"
          fill="none"
          stroke="url(#loaderGradient)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray="180 180"
          strokeDashoffset="60"
        />
      </svg>
    </div>
  )
}
