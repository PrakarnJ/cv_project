import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import TopBar from './components/TopBar'
import TabBar from './components/TabBar'
import Tutorial from './panels/Tutorial'
import Playground from './panels/Playground'
import Exercises from './panels/Exercises'
import Progress from './panels/Progress'
import { useLessonStore } from './store/lessonStore'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { refetchOnWindowFocus: false, staleTime: 60_000 },
  },
})

const PANELS = {
  tutorial: Tutorial,
  playground: Playground,
  exercises: Exercises,
  progress: Progress,
}

function AppShell() {
  const activeTab = useLessonStore((s) => s.activeTab)
  const ActivePanel = PANELS[activeTab] ?? Tutorial
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <TopBar />
      <TabBar />
      <main className="mx-auto max-w-5xl px-6 py-8">
        <ActivePanel />
      </main>
    </div>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppShell />
    </QueryClientProvider>
  )
}
