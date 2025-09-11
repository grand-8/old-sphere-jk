import type { LifePoint } from "@/lib/data-service"

export interface MountainCalculationResult {
  verticalOffset: number
  amplificationDynamique: number
  minOffsetScore: number
  maxOffsetScore: number
  maxAmplifiedScore: number
  variationTotale: number
  normalizationFactor: number
  currentMin: number
}

/**
 * Calcule l'amplification dynamique pour une trajectoire avec normalisation uniforme
 * @param dataPoints - Points de données de la trajectoire
 * @returns Résultats des calculs pour l'amplification normalisée
 */
export function calculateDynamicAmplification(dataPoints: LifePoint[]): MountainCalculationResult {
  if (!dataPoints || dataPoints.length === 0) {
    return {
      verticalOffset: 5,
      amplificationDynamique: 6,
      minOffsetScore: 0,
      maxOffsetScore: 0,
      maxAmplifiedScore: 0,
      variationTotale: 0,
      normalizationFactor: 1,
      currentMin: 0,
    }
  }

  // Calcul du décalage vertical pour gérer les scores négatifs
  const minCumulativeScore = Math.min(...dataPoints.map((p) => p.cumulativeScore))
  const SAFETY_OFFSET = 5
  const verticalOffset = minCumulativeScore < 0 ? Math.abs(minCumulativeScore) + SAFETY_OFFSET : SAFETY_OFFSET

  // Calcul des scores avec décalage et vérification de sécurité
  const offsetScores = dataPoints.map((p) => {
    const score = p.cumulativeScore + verticalOffset
    return isNaN(score) ? verticalOffset : score
  })

  const minOffsetScore = Math.min(...offsetScores)
  const maxOffsetScore = Math.max(...offsetScores)

  // NOUVELLE LOGIQUE : Amplification fixe de 6 pour tous
  const amplificationFixe = 6

  // Calculer rawHeights avec amplification fixe
  const rawHeights = offsetScores.map((score) => score * amplificationFixe)

  // Trouver currentMin/currentMax avec vérification de sécurité
  const currentMin = Math.min(...rawHeights)
  let currentMax = Math.max(...rawHeights)

  // Sécurité anti-NaN : forcer currentMax > currentMin
  if (currentMax === currentMin || isNaN(currentMax) || isNaN(currentMin)) {
    currentMax = currentMin + 1
  }

  // Calculer le facteur de normalisation pour atteindre hauteur cible 1.0
  const targetRange = 0.5 // Réduction de moitié de la hauteur maximale (1.0 -> 0.5)
  const normalizationFactor = targetRange / (currentMax - currentMin)

  // Calcul de la variation totale pour information
  const variationTotale = maxOffsetScore - minOffsetScore

  // Score amplifié maximum pour compatibilité (non utilisé avec la normalisation)
  const maxAmplifiedScore = maxOffsetScore * amplificationFixe

  return {
    verticalOffset,
    amplificationDynamique: amplificationFixe,
    minOffsetScore,
    maxOffsetScore,
    maxAmplifiedScore,
    variationTotale,
    normalizationFactor,
    currentMin,
  }
}

/**
 * Calcule la hauteur d'un point avec normalisation uniforme
 * @param cumulativeScore - Score cumulatif du point
 * @param calculation - Résultat des calculs d'amplification
 * @param baseHeight - Hauteur de base de la montagne
 * @returns Hauteur calculée et normalisée pour le point
 */
export function calculatePointHeight(
  cumulativeScore: number,
  calculation: MountainCalculationResult,
  baseHeight: number,
): number {
  // Vérification de sécurité anti-NaN
  if (isNaN(cumulativeScore)) return 0.2

  // Utiliser la nouvelle logique de normalisation
  const rawHeight = (cumulativeScore + calculation.verticalOffset) * 6

  // Normaliser pour que toutes les montagnes atteignent ~1.0 de hauteur max
  const normalizedHeight = 0.2 + (rawHeight - calculation.currentMin) * calculation.normalizationFactor

  // Vérification de sécurité : limiter les résultats entre 0.05 et 1.2
  const safeHeight = Math.max(0.05, Math.min(1.2, normalizedHeight))

  // Retourner la hauteur finale (isNaN check final)
  return isNaN(safeHeight) ? 0.2 : safeHeight
}

/**
 * Calcule la base adaptative pour une trajectoire
 * @param points - Points 3D générés (excluant début/fin)
 * @returns Hauteur de la base adaptative
 */
export function calculateAdaptiveBase(points: { y: number }[]): number {
  if (points.length === 0) return 0.05

  const validPoints = points.filter((p) => !isNaN(p.y))
  if (validPoints.length === 0) return 0.05

  const minPointHeight = Math.min(...validPoints.map((p) => p.y))
  return Math.max(minPointHeight * 0.7, 0.05)
}

/**
 * Configuration unifiée pour les paramètres de montagne
 * @param isModal - True si c'est pour la modal, false pour la sphère
 * @returns Objet de configuration avec les paramètres harmonisés
 */
export function getUnifiedMountainConfig(isModal: boolean) {
  return {
    maxHeight: 0.5,
    baseRadius: 0.4,
    centralHeightMultiplier: 1.2,
    individualVariation: isModal ? 0 : 0.15,
  }
}
