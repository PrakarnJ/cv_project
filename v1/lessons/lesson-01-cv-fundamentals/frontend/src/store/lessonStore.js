import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useLessonStore = create(
  persist(
    (set) => ({
      activeTab: 'tutorial',
      setActiveTab: (tab) => set({ activeTab: tab }),

      activeExerciseId: 'ex1',
      setActiveExerciseId: (id) => set({ activeExerciseId: id }),

      exerciseCode: {},
      setExerciseCode: (id, code) =>
        set((state) => ({
          exerciseCode: { ...state.exerciseCode, [id]: code },
        })),
    }),
    {
      name: 'lesson-01-store',
      // Only the editor buffers survive reloads; the active tab resets to
      // Tutorial on reload (per design.md state-ownership table).
      partialize: (state) => ({ exerciseCode: state.exerciseCode }),
    },
  ),
)
