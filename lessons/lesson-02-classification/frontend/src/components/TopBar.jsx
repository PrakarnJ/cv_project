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
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
      <div className="flex items-baseline gap-4">
        <span className="text-sm font-medium text-slate-500">cv-learning</span>
        <h1 className="text-lg font-medium text-slate-900">
          Lesson 01: <span data-testid="lesson-title">{title}</span>
        </h1>
        {subtitle && (
          <span className="text-sm text-slate-500">{subtitle}</span>
        )}
      </div>
      <ProgressDots total={TOTAL_LESSONS} active={CURRENT_LESSON} />
    </header>
  )
}
