import { type NextRequest, NextResponse } from "next/server"

const JOBTREK_API_CONFIG = {
  baseUrl: "https://form.jobtrek.ch",
  endpoint: "/api/export/trajectories",
  username: "jobtrek_export",
  password: "secure_password_2024",
}

async function getApiData(): Promise<Response> {
  console.log("🌐 Mode production - Appel API Jobtrek...")

  const credentials = btoa(`${JOBTREK_API_CONFIG.username}:${JOBTREK_API_CONFIG.password}`)

  const apiUrl = `${JOBTREK_API_CONFIG.baseUrl}${JOBTREK_API_CONFIG.endpoint}`

  console.log(`📡 Requête vers: ${apiUrl}`)

  const response = await fetch(apiUrl, {
    method: "GET",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
    },
    signal: AbortSignal.timeout(30000),
  })

  console.log(`📊 Statut de réponse: ${response.status} ${response.statusText}`)

  if (!response.ok) {
    const errorText = await response.text()
    console.error(`❌ Erreur API (${response.status}):`, errorText)

    return NextResponse.json(
      {
        error: `Erreur API: ${response.status} ${response.statusText}`,
        details: errorText,
      },
      { status: response.status },
    )
  }

  const contentType = response.headers.get("content-type")
  if (!contentType || !contentType.includes("application/json")) {
    const responseText = await response.text()
    console.error("❌ Réponse non-JSON reçue:", responseText.substring(0, 200))

    return NextResponse.json(
      {
        error: "Réponse non-JSON reçue de l'API",
        contentType,
        preview: responseText.substring(0, 200),
      },
      { status: 502 },
    )
  }

  const data = await response.json()

  console.log(`✅ Données reçues: ${data.trajectories?.length || 0} trajectoires`)

  // Log a sample trajectory to see the data structure
  if (data.trajectories && data.trajectories.length > 0) {
    const sampleTrajectory = data.trajectories.find((t) => t.userCode === "J0109") || data.trajectories[0]
    console.log("[v0] Sample trajectory structure:", JSON.stringify(sampleTrajectory, null, 2))

    if (sampleTrajectory.points && sampleTrajectory.points.length > 0) {
      const samplePoint = sampleTrajectory.points[0]
      console.log("[v0] Sample point keys:", Object.keys(samplePoint))
      console.log("[v0] Sample point termine field:", samplePoint.termine)
    }
  }

  if (!data.trajectories || !Array.isArray(data.trajectories)) {
    console.error("❌ Structure de données invalide:", data)
    return NextResponse.json(
      {
        error: "Structure de données invalide",
        received: typeof data,
      },
      { status: 502 },
    )
  }

  return NextResponse.json(data, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    },
  })
}

export async function GET(request: NextRequest) {
  try {
    return await getApiData()
  } catch (error) {
    console.error("❌ Erreur lors de l'appel API:", error)

    if (error instanceof TypeError && error.message.includes("fetch")) {
      return NextResponse.json(
        {
          error: "Impossible de contacter l'API Jobtrek",
          details: "Vérifiez l'URL et la connectivité réseau",
        },
        { status: 503 },
      )
    }

    if (error instanceof DOMException && error.name === "AbortError") {
      return NextResponse.json(
        {
          error: "Timeout de l'API",
          details: "L'API a mis trop de temps à répondre",
        },
        { status: 504 },
      )
    }

    return NextResponse.json(
      {
        error: "Erreur interne du serveur",
        details: error instanceof Error ? error.message : "Erreur inconnue",
      },
      { status: 500 },
    )
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  })
}
