import { create } from "zustand"
import type { LifeTrajectory } from "./data-service"
import { filterTrajectories } from "./filter-utils"
import { dataService } from "./data-service"

export type ViewType = "sphere" | "linear"

interface CameraPosition {
  x: number
  y: number
  z: number
  targetX: number
  targetY: number
  targetZ: number
}

interface LifeTrajectoryState {
  // États existants
  selectedPerson: LifeTrajectory | null
  setSelectedPerson: (person: LifeTrajectory | null) => void

  currentView: ViewType
  setCurrentView: (view: ViewType) => void

  // États pour la recherche
  searchQuery: string
  filteredTrajectories: LifeTrajectory[]
  isFiltering: boolean
  isDirectCodeSearch: boolean
  setSearchQuery: (query: string) => void

  trajectoryData: LifeTrajectory[]
  isLoading: boolean
  error: string | null

  isIntroAnimationPlaying: boolean
  setIsIntroAnimationPlaying: (playing: boolean) => void

  sphereCameraPosition: CameraPosition | null
  setSphereCameraPosition: (position: CameraPosition | null) => void
}

export const useLifeTrajectoryStore = create<LifeTrajectoryState>((set, get) => ({
  // États existants
  selectedPerson: null,
  setSelectedPerson: (selectedPerson) => set({ selectedPerson }),

  currentView: "sphere",
  setCurrentView: (currentView) => set({ currentView }),

  // États pour la recherche
  searchQuery: "",
  filteredTrajectories: [],
  isFiltering: false,
  isDirectCodeSearch: false,
  setSearchQuery: (searchQuery) => {
    const { trajectoryData } = get()
    const result = filterTrajectories(trajectoryData, searchQuery)
    set({
      searchQuery,
      filteredTrajectories: result.trajectories,
      isFiltering: searchQuery.length > 0,
      isDirectCodeSearch: result.isDirectCodeSearch,
    })
  },

  trajectoryData: [],
  isLoading: false,
  error: null,

  isIntroAnimationPlaying: true,
  setIsIntroAnimationPlaying: (isIntroAnimationPlaying) => set({ isIntroAnimationPlaying }),

  sphereCameraPosition: null,
  setSphereCameraPosition: (sphereCameraPosition) => set({ sphereCameraPosition }),

  loadData: async () => {
    const { searchQuery } = get()

    set({ isLoading: true, error: null })

    try {
      console.log("📊 Chargement des données depuis l'API")

      const trajectoryData = await dataService.getData()

      const result = filterTrajectories(trajectoryData, searchQuery)

      set({
        trajectoryData,
        filteredTrajectories: result.trajectories,
        isDirectCodeSearch: result.isDirectCodeSearch,
        isLoading: false,
        error: null,
      })

      console.log(`✅ ${trajectoryData.length} trajectoires chargées depuis l'API`)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Erreur inconnue"

      console.error("❌ Erreur lors du chargement depuis l'API:", error)

      set({
        isLoading: false,
        error: errorMessage,
        trajectoryData: [],
        filteredTrajectories: [],
        isDirectCodeSearch: false,
      })
    }
  },

  // Actualiser les données
  refreshData: async () => {
    await get().loadData()
  },
}))

// Charger les données initiales au démarrage
if (typeof window !== "undefined") {
  useLifeTrajectoryStore.getState().loadData()
}
