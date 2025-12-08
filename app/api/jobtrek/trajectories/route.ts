import { type NextRequest, NextResponse } from "next/server"
import { Buffer } from "buffer"

const getApiConfig = () => {
  let url = process.env.JOBTREK_API_URL
  const username = process.env.JOBTREK_API_USERNAME
  const password = process.env.JOBTREK_API_PASSWORD

  if (url && !url.startsWith("http://") && !url.startsWith("https://")) {
    url = `https://${url}`
  }

  console.log("[v0] ENV Check:", {
    hasUrl: !!url,
    urlValue: url ? url.substring(0, 40) + "..." : "MISSING",
    hasUsername: !!username,
    usernameValue: username || "MISSING",
    hasPassword: !!password,
    passwordLength: password ? password.length : 0,
    passwordPrefix: password ? password.substring(0, 4) + "..." : "MISSING",
  })

  if (!url || !username || !password) {
    throw new Error("Missing JOBTREK_API_URL, JOBTREK_API_USERNAME, or JOBTREK_API_PASSWORD environment variables")
  }

  return {
    baseUrl: url,
    endpoint: "/api/export/trajectories",
    username,
    password,
  }
}

async function getApiData(): Promise<Response> {
  console.log("Mode production - Appel API Jobtrek...")

  const config = getApiConfig()

  const credentialsString = `${config.username}:${config.password}`
  const credentials = Buffer.from(credentialsString, "utf-8").toString("base64")

  const apiUrl = `${config.baseUrl}${config.endpoint}`

  console.log("[v0] Full API URL:", apiUrl)
  console.log("[v0] Auth header:", `Basic ${credentials}`)

  const response = await fetch(apiUrl, {
    method: "GET",
    headers: {
      Authorization: `Basic ${credentials}`,
      Accept: "*/*",
      "User-Agent": "v0-jobtrek-client/1.0",
    },
  })

  console.log("[v0] Response status:", response.status, response.statusText)
  console.log("[v0] Response headers:", Object.fromEntries(response.headers.entries()))

  console.log(`Statut de réponse: ${response.status} ${response.statusText}`)

  if (!response.ok) {
    const errorText = await response.text()
    console.error(`Erreur API (${response.status}):`, errorText)

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
    console.error("Réponse non-JSON reçue:", responseText.substring(0, 200))

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

  console.log(`Données reçues: ${data.trajectories?.length || 0} trajectoires`)

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
    console.error("Structure de données invalide:", data)
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
    console.error("Erreur lors de l'appel API:", error)

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
