import { useLessonStore } from '../store/lessonStore'

const TABS = [
  { id: 'tutorial', label: 'Tutorial' },
  { id: 'playground', label: 'Playground' },
  { id: 'exercises', label: 'Exercises' },
  { id: 'progress', label: 'Progress' },
]

export default function TabBar() {
  const activeTab = useLessonStore((s) => s.activeTab)
  const setActiveTab = useLessonStore((s) => s.setActiveTab)
  return (
    <nav
      className="border-b border-crt-border bg-crt-surface px-6"
      aria-label="Lesson sections"
    >
      <ul className="flex gap-6">
        {TABS.map((tab) => {
          const active = activeTab === tab.id
          return (
            <li key={tab.id}>
              <button
                type="button"
                onClick={() => setActiveTab(tab.id)}
                aria-current={active ? 'page' : undefined}
                className={
                  'inline-flex items-center border-b-2 px-1 py-3 text-sm font-medium transition ' +
                  (active
                    ? 'border-crt-accent text-crt-text glow'
                    : 'border-transparent text-crt-muted hover:text-crt-text')
                }
              >
                {tab.label}
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
