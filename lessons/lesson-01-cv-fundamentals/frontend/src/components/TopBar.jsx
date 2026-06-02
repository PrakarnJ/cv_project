import { useQuery } from '@tanstack/react-query'
import { getLesson } from '../api'
import ProgressDots from './ProgressDots'

const TOTAL_LESSONS = 12
const CURRENT_LESSON = 1

export default function TopBar() {
  const { data: lesson } = useQuery({
    queryKey: ['lesson'],
    queryFn: getLesson,
  })
  const title = lesson?.title ?? 'Loading…'
  const subtitle = lesson?.subtitle
  return (
    <header className="flex items-center justify-between border-b border-crt-border bg-crt-surface px-6 py-3 glow-box">
      <div className="flex items-baseline gap-4">
        <span className="text-sm text-crt-muted">cv-learning</span>
        <h1 className="text-lg font-medium text-crt-text glow">
          Lesson 01: <span data-testid="lesson-title">{title}</span>
        </h1>
        {subtitle && (
          <span className="text-sm text-crt-muted">{subtitle}</span>
        )}
      </div>
      <ProgressDots total={TOTAL_LESSONS} active={CURRENT_LESSON} />
    </header>
  )
}
