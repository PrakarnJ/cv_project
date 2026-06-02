import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import rehypeHighlight from 'rehype-highlight'

import { getTutorial } from '../api'
import { useLessonStore } from '../store/lessonStore'
import ConvolutionDemo from '../widgets/ConvolutionDemo'
import KernelVisualizer from '../widgets/KernelVisualizer'

// react-markdown lowercases HTML tag names, so the JSX <ConvolutionDemo /> in
// README.md arrives here as a `convolutiondemo` element after rehype-raw.
const MARKDOWN_COMPONENTS = {
  convolutiondemo: ConvolutionDemo,
  kernelvisualizer: KernelVisualizer,
}
const REMARK_PLUGINS = [remarkGfm]
const REHYPE_PLUGINS = [rehypeRaw, rehypeHighlight]

const WORDS_PER_MINUTE = 200

function readTime(content) {
  if (!content) return 0
  const words = content.trim().split(/\s+/).length
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE))
}

export default function Tutorial() {
  const setActiveTab = useLessonStore((s) => s.setActiveTab)
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['tutorial'],
    queryFn: getTutorial,
  })

  const content = data?.content ?? ''
  const minutes = useMemo(() => readTime(content), [content])

  if (isLoading) return <p className="text-crt-muted">Loading tutorial…</p>
  if (isError)
    return (
      <p className="text-red-400">
        Failed to load tutorial: {error?.message ?? 'unknown error'}
      </p>
    )

  return (
    <article>
      <div className="mb-4 flex items-center justify-between text-sm text-crt-muted">
        <span>{minutes} min read</span>
      </div>
      <div className="prose prose-crt max-w-none">
        <ReactMarkdown
          remarkPlugins={REMARK_PLUGINS}
          rehypePlugins={REHYPE_PLUGINS}
          components={MARKDOWN_COMPONENTS}
        >
          {content}
        </ReactMarkdown>
      </div>
      <div className="mt-8 flex justify-end">
        <button
          type="button"
          onClick={() => setActiveTab('playground')}
          className="rounded bg-crt-accent px-4 py-2 text-sm font-medium text-crt-text hover:bg-crt-accent-hover"
        >
          Next → Playground
        </button>
      </div>
    </article>
  )
}
