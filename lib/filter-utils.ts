import type { LifeTrajectory } from "./data-service"

/**
 * Fonction pure pour filtrer les trajectoires basée sur une requête de recherche
 * @param trajectories - Tableau des trajectoires à filtrer
 * @param searchQuery - Requête de recherche
 * @returns Objet avec les trajectoires filtrées et un flag indiquant si c'est une recherche directe par code
 */
export function filterTrajectories(
  trajectories: LifeTrajectory[],
  searchQuery: string,
): {
  trajectories: LifeTrajectory[]
  isDirectCodeSearch: boolean
} {
  // Cas edge 1: Données invalides
  if (!trajectories || !Array.isArray(trajectories)) {
    console.warn("filterTrajectories: trajectories invalides, retour d'un tableau vide")
    return { trajectories: [], isDirectCodeSearch: false }
  }

  // Cas edge 2: Recherche vide ou undefined/null
  if (!searchQuery || typeof searchQuery !== "string" || searchQuery.trim().length === 0) {
    return {
      trajectories: trajectories.filter((trajectory) => trajectory.points && trajectory.points.length >= 3),
      isDirectCodeSearch: false,
    }
  }

  // Nettoyer et normaliser la requête de recherche
  const cleanQuery = normalizeSearchQuery(searchQuery)

  // Cas edge 3: Requête trop courte après nettoyage
  if (cleanQuery.length < 1) {
    return {
      trajectories: trajectories.filter((trajectory) => trajectory.points && trajectory.points.length >= 3),
      isDirectCodeSearch: false,
    }
  }

  // Filtrer normalement (avec le filtre des 3 étapes minimum)
  const normalFiltered = trajectories.filter((trajectory) => {
    // Vérifier que la trajectoire est valide
    if (!trajectory || !trajectory.name || typeof trajectory.name !== "string") {
      return false
    }

    // Construire tous les champs recherchables
    const searchableFields = [
      trajectory.userCode || "",
      trajectory.typeMesure || "",
      trajectory.category || "",
      ...trajectory.points.map((p) => p.sousCategorie || "").filter(Boolean),
      ...trajectory.points.map((p) => p.event || "").filter(Boolean),
    ]

    const allSearchableText = searchableFields.join(" ")
    const normalizedSearchable = normalizeSearchQuery(allSearchableText)
    const matchesSearch = normalizedSearchable.includes(cleanQuery)

    // Appliquer le filtre des 3 étapes minimum
    return matchesSearch && trajectory.points && trajectory.points.length >= 3
  })

  // Si on a des résultats normaux, les retourner
  if (normalFiltered.length > 0) {
    const hasDirectCodeMatch = normalFiltered.some(
      (t) => t.userCode && normalizeSearchQuery(t.userCode).includes(cleanQuery),
    )
    return { trajectories: normalFiltered, isDirectCodeSearch: hasDirectCodeMatch }
  }

  // Si aucun résultat normal, chercher dans les parcours cachés (< 3 étapes)
  const hiddenMatches = trajectories.filter((trajectory) => {
    if (!trajectory || !trajectory.name || typeof trajectory.name !== "string") {
      return false
    }

    // Ne considérer que les parcours cachés (< 3 étapes)
    if (trajectory.points && trajectory.points.length >= 3) {
      return false
    }

    const searchableFields = [
      trajectory.userCode || "",
      trajectory.typeMesure || "",
      trajectory.category || "",
      ...trajectory.points.map((p) => p.sousCategorie || "").filter(Boolean),
      ...trajectory.points.map((p) => p.event || "").filter(Boolean),
    ]

    const allSearchableText = searchableFields.join(" ")
    const normalizedSearchable = normalizeSearchQuery(allSearchableText)
    return normalizedSearchable.includes(cleanQuery)
  })

  // Si exactement 1 parcours caché correspond, l'afficher
  if (hiddenMatches.length === 1) {
    const hasDirectCodeMatch = hiddenMatches.some(
      (t) => t.userCode && normalizeSearchQuery(t.userCode).includes(cleanQuery),
    )
    return { trajectories: hiddenMatches, isDirectCodeSearch: hasDirectCodeMatch }
  }

  // Sinon, retourner aucun résultat
  if (normalFiltered.length === 0 && hiddenMatches.length === 0) {
    console.info(`filterTrajectories: Aucun résultat pour "${searchQuery}"`)
  }

  return { trajectories: [], isDirectCodeSearch: false }
}

/**
 * Normalise une chaîne de recherche pour la comparaison
 * @param input - Chaîne à normaliser
 * @returns Chaîne normalisée
 */
function normalizeSearchQuery(input: string): string {
  if (!input || typeof input !== "string") {
    return ""
  }

  return input
    .toLowerCase() // Insensible à la casse
    .trim() // Supprimer les espaces en début/fin
    .replace(/\s+/g, " ") // Normaliser les espaces multiples
    .normalize("NFD") // Décomposer les caractères accentués
    .replace(/[\u0300-\u036f]/g, "") // Supprimer les accents
    .replace(/[^\w\s]/g, "") // Supprimer les caractères spéciaux (garde lettres, chiffres, espaces)
}

/**
 * Fonction utilitaire pour valider une requête de recherche
 * @param query - Requête à valider
 * @returns true si la requête est valide pour le filtrage
 */
export function isValidSearchQuery(query: string): boolean {
  if (!query || typeof query !== "string") {
    return false
  }

  const cleaned = normalizeSearchQuery(query)
  return cleaned.length >= 1
}

/**
 * Fonction utilitaire pour obtenir des statistiques de filtrage
 * @param originalCount - Nombre original de trajectoires
 * @param filteredCount - Nombre de trajectoires après filtrage
 * @param searchQuery - Requête utilisée
 * @returns Objet avec les statistiques
 */
export function getFilterStats(
  originalCount: number,
  filteredCount: number,
  searchQuery: string,
): {
  originalCount: number
  filteredCount: number
  isFiltered: boolean
  hasResults: boolean
  searchQuery: string
} {
  return {
    originalCount,
    filteredCount,
    isFiltered: isValidSearchQuery(searchQuery),
    hasResults: filteredCount > 0,
    searchQuery: searchQuery.trim(),
  }
}
