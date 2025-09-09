import { create } from "zustand"
import type { LifeTrajectory } from "./data-generator"
import { fetchTrajectories } from "./api"
import { filterTrajectories } from "./filter-utils"

interface LifeTrajectoryState {
  // États existants
  selectedPerson: LifeTrajectory | null
  setSelectedPerson: (person: LifeTrajectory | null) => void

  // États pour la recherche
  searchQuery: string
  filteredTrajectories: LifeTrajectory[]
  isFiltering: boolean

  // Nouveaux états pour l'API
  trajectoryData: LifeTrajectory[]
  isLoadingData: boolean
  apiError: string | null
  lastFetchTime: number | null

  // Actions
  setSearchQuery: (query: string) => void
  loadTrajectories: () => Promise<void>
  refreshData: () => Promise<void>
}

export const useLifeTrajectoryStore = create<LifeTrajectoryState>((set, get) => ({
  // États existants
  selectedPerson: null,
  setSelectedPerson: (selectedPerson) => set({ selectedPerson }),

  // États de recherche
  searchQuery: "",
  filteredTrajectories: [],
  isFiltering: false,

  // Nouveaux états pour l'API
  trajectoryData: [],
  isLoadingData: true,
  apiError: null,
  lastFetchTime: null,

  // Fonction pour mettre à jour la recherche
  setSearchQuery: (searchQuery) => {
    const { trajectoryData } = get()
    const filtered = filterTrajectories(trajectoryData, searchQuery)

    set({
      searchQuery,
      filteredTrajectories: filtered,
      isFiltering: searchQuery.length > 0,
    })
  },

  // Fonction pour charger les trajectoires depuis l'API
  loadTrajectories: async () => {
    const { lastFetchTime } = get()

    // Éviter les appels trop fréquents (cache de 5 minutes)
    const now = Date.now()
    if (lastFetchTime && now - lastFetchTime < 5 * 60 * 1000) {
      console.log("Using cached data, skipping API call")
      return
    }

    set({ isLoadingData: true, apiError: null })

    try {
      console.log("Loading trajectories from API...")
      const trajectories = await fetchTrajectories({ limit: 400 })

      // Appliquer le filtre de recherche actuel aux nouvelles données
      const { searchQuery } = get()
      const filtered = filterTrajectories(trajectories, searchQuery)

      set({
        trajectoryData: trajectories,
        filteredTrajectories: filtered,
        isLoadingData: false,
        apiError: null,
        lastFetchTime: now,
      })

      console.log(`Successfully loaded ${trajectories.length} trajectories`)
    } catch (error) {
      console.error("Failed to load trajectories:", error)

      set({
        isLoadingData: false,
        apiError: error instanceof Error ? error.message : "Erreur de chargement des données",
      })
    }
  },

  // Fonction pour forcer le rechargement des données
  refreshData: async () => {
    set({ lastFetchTime: null }) // Reset du cache
    await get().loadTrajectories()
  },
}))
