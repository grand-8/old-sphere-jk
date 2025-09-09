import type { LifeTrajectory } from "./data-generator"

// Configuration de l'API
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "https://api.example.com"
const API_TIMEOUT = 10000 // 10 secondes

// Interface pour la réponse de l'API
interface ApiResponse<T> {
  data: T
  success: boolean
  message?: string
  total?: number
}

// Interface pour les paramètres de requête
interface FetchTrajectoriesParams {
  limit?: number
  offset?: number
  category?: string
  search?: string
}

/**
 * Fonction utilitaire pour faire des appels API avec timeout
 */
async function fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT)

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    })

    clearTimeout(timeoutId)
    return response
  } catch (error) {
    clearTimeout(timeoutId)
    throw error
  }
}

/**
 * Récupère les trajectoires de vie depuis l'API
 */
export async function fetchTrajectories(params: FetchTrajectoriesParams = {}): Promise<LifeTrajectory[]> {
  try {
    // Construire l'URL avec les paramètres de requête
    const searchParams = new URLSearchParams()

    if (params.limit) searchParams.append("limit", params.limit.toString())
    if (params.offset) searchParams.append("offset", params.offset.toString())
    if (params.category) searchParams.append("category", params.category)
    if (params.search) searchParams.append("search", params.search)

    const url = `${API_BASE_URL}/trajectories?${searchParams.toString()}`

    console.log("Fetching trajectories from API:", url)

    const response = await fetchWithTimeout(url)

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const result: ApiResponse<LifeTrajectory[]> = await response.json()

    if (!result.success) {
      throw new Error(result.message || "API returned unsuccessful response")
    }

    // Valider les données reçues
    if (!Array.isArray(result.data)) {
      throw new Error("API response data is not an array")
    }

    // Valider chaque trajectoire
    const validatedTrajectories = result.data.filter((trajectory) => {
      return (
        trajectory &&
        typeof trajectory.id === "string" &&
        typeof trajectory.name === "string" &&
        Array.isArray(trajectory.points) &&
        trajectory.points.length > 0
      )
    })

    console.log(`Successfully fetched ${validatedTrajectories.length} trajectories from API`)
    return validatedTrajectories
  } catch (error) {
    console.error("Error fetching trajectories from API:", error)

    // En cas d'erreur, retourner des données de fallback
    console.warn("Falling back to mock data due to API error")
    const { generateMockData } = await import("./data-generator")
    return generateMockData(params.limit || 400)
  }
}

/**
 * Récupère une trajectoire spécifique par son ID
 */
export async function fetchTrajectoryById(id: string): Promise<LifeTrajectory | null> {
  try {
    const url = `${API_BASE_URL}/trajectories/${id}`

    console.log("Fetching trajectory by ID from API:", url)

    const response = await fetchWithTimeout(url)

    if (!response.ok) {
      if (response.status === 404) {
        return null
      }
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const result: ApiResponse<LifeTrajectory> = await response.json()

    if (!result.success) {
      throw new Error(result.message || "API returned unsuccessful response")
    }

    return result.data
  } catch (error) {
    console.error("Error fetching trajectory by ID from API:", error)
    return null
  }
}

/**
 * Fonction pour tester la connectivité de l'API
 */
export async function testApiConnection(): Promise<boolean> {
  try {
    const url = `${API_BASE_URL}/health`
    const response = await fetchWithTimeout(url, { method: "GET" })
    return response.ok
  } catch (error) {
    console.error("API connection test failed:", error)
    return false
  }
}

/**
 * Hook personnalisé pour gérer l'état de chargement des données API
 */
export interface ApiState<T> {
  data: T | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}
