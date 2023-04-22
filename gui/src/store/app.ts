import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

interface AppState {
  bears: number
  increase: (by: number) => void
}

export const useAppStore = create<AppState>()(
  devtools(
    persist(
      (set) => ({
        bears: 0,
        increase: (by) => set((state) => ({ bears: state.bears + by })),
      }),
      {
        name: 'app-storage',
      }
    )
  )
)
