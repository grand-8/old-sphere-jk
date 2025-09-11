// Interface unifiée pour les réponses API
interface ApiResponse {
  trajectories: ApiTrajectory[]
  metadata: {
    totalCount: number
    lastUpdated: string
    apiVersion: string
  }
}

interface ApiTrajectory {
  id: string
  userCode: string
  name: string
  typeMesure: string
  startYear: number
  points: ApiPoint[]
  maxHeight: number
}

interface ApiPoint {
  year: number
  score: number
  event: string
  categorie: string
  sousCategorie: string | null
  cumulativeScore: number
  termine: boolean | null
}

export interface LifeTrajectory {
  id: string
  userCode: string
  name: string
  typeMesure: string
  category: "education" | "career" | "entrepreneurship" | "health" | "personal"
  startYear: number
  maxHeight: number
  points: {
    year: number
    score: number
    event: string
    categorie: string
    sousCategorie: string | null
    cumulativeScore: number
    termine: boolean | null
  }[]
}

// Mapping des catégories françaises vers anglaises
const CATEGORY_MAPPING: Record<string, LifeTrajectory["category"]> = {
  Formation: "education",
  "Expérience professionnelle": "career",
  "Mesures de Transition 1": "entrepreneurship",
  "Phase pré-professionnelle": "education",
  "Période de transition / suspension d'activité": "health",
  "Facteurs contextuels": "health",
}

function mapCategory(categorie: string): LifeTrajectory["category"] {
  return CATEGORY_MAPPING[categorie] || "education"
}

// Transformation des données API vers notre format
function transformApiTrajectory(apiTrajectory: ApiTrajectory): LifeTrajectory {
  // Déterminer la catégorie principale depuis le premier point
  const primaryCategory = apiTrajectory.points.length > 0 ? mapCategory(apiTrajectory.points[0].categorie) : "education"

  return {
    id: apiTrajectory.id,
    userCode: apiTrajectory.userCode,
    name: apiTrajectory.name,
    typeMesure: apiTrajectory.typeMesure,
    category: primaryCategory,
    startYear: apiTrajectory.startYear,
    maxHeight: apiTrajectory.maxHeight,
    points: apiTrajectory.points.map((point) => ({
      year: point.year,
      score: point.score,
      event: point.event,
      categorie: point.categorie,
      sousCategorie: point.sousCategorie,
      cumulativeScore: point.cumulativeScore,
      termine: point.termine,
    })),
  }
}

export class DataService {
  private static instance: DataService

  static getInstance(): DataService {
    if (!DataService.instance) {
      DataService.instance = new DataService()
    }
    return DataService.instance
  }

  // Récupération des données API
  async getData(): Promise<LifeTrajectory[]> {
    try {
      console.log("🌐 Récupération des données API...")

      const response = await fetch("/api/jobtrek/trajectories", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        // Ajouter un timeout côté client aussi
        signal: AbortSignal.timeout(30000),
      })

      console.log(`📊 Statut de réponse: ${response.status} ${response.statusText}`)

      if (!response.ok) {
        // Essayer de lire le message d'erreur depuis l'API
        let errorMessage = `Erreur HTTP ${response.status}: ${response.statusText}`

        try {
          const errorData = await response.json()
          if (errorData.error) {
            errorMessage = errorData.error
            if (errorData.details) {
              errorMessage += ` (${errorData.details})`
            }
          }
        } catch (parseError) {
          // Si on ne peut pas parser l'erreur JSON, essayer le texte
          try {
            const errorText = await response.text()
            if (errorText && errorText.length > 0) {
              errorMessage += ` - ${errorText.substring(0, 100)}`
            }
          } catch (textError) {
            // Ignorer les erreurs de parsing
          }
        }

        throw new Error(errorMessage)
      }

      // Vérifier le type de contenu
      const contentType = response.headers.get("content-type")
      if (!contentType || !contentType.includes("application/json")) {
        let responsePreview = "Contenu non disponible"
        try {
          const responseText = await response.text()
          responsePreview = responseText.substring(0, 200)
        } catch {
          // Ignorer l'erreur de lecture
        }

        console.error("❌ Réponse non-JSON:", responsePreview)
        throw new Error(`Réponse non-JSON reçue. Type de contenu: ${contentType || "inconnu"}`)
      }

      let apiResponse: ApiResponse
      try {
        apiResponse = await response.json()
      } catch (jsonError) {
        console.error("❌ Erreur de parsing JSON:", jsonError)
        throw new Error("Impossible de parser la réponse JSON de l'API")
      }

      // Valider la structure
      if (!apiResponse || typeof apiResponse !== "object") {
        throw new Error("Réponse API invalide: objet attendu")
      }

      if (!apiResponse.trajectories) {
        throw new Error("Réponse API invalide: propriété 'trajectories' manquante")
      }

      if (!Array.isArray(apiResponse.trajectories)) {
        throw new Error("Réponse API invalide: 'trajectories' doit être un tableau")
      }

      console.log(`✅ ${apiResponse.trajectories.length} trajectoires récupérées depuis l'API`)

      // Transformer les données
      const transformedData = apiResponse.trajectories.map((trajectory, index) => {
        try {
          return transformApiTrajectory(trajectory)
        } catch (transformError) {
          console.error(`❌ Erreur de transformation pour la trajectoire ${index}:`, transformError)
          throw new Error(`Erreur de transformation des données (trajectoire ${index})`)
        }
      })

      return transformedData
    } catch (error) {
      console.error("❌ Erreur lors de la récupération des données API:", error)

      // Améliorer les messages d'erreur selon le type
      if (error instanceof TypeError && error.message.includes("fetch")) {
        throw new Error("Impossible de contacter l'API - Vérifiez votre connexion internet")
      }

      if (error instanceof DOMException && error.name === "AbortError") {
        throw new Error("Timeout de l'API - L'API met trop de temps à répondre (>30s)")
      }

      if (error instanceof Error) {
        // Relancer l'erreur avec le message original si c'est déjà une Error
        throw error
      }

      // Pour les erreurs inconnues
      throw new Error(`Erreur inconnue: ${String(error)}`)
    }
  }
}

// Export de l'instance singleton
export const dataService = DataService.getInstance()
