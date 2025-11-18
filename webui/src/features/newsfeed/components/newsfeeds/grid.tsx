// src/features/newsfeed/components/newsfeeds/grid-masonry.tsx
import type { UrlAnnotation } from '@/features/agent/types/tool-outputs'
import { LinkPreviewCard } from '@/features/agent/components/link-preview'
import { cn } from '@/lib/utils'
import { useMemo } from 'react'

/**
 * Masonry using CSS columns:
 * - 1 col on mobile, 2 on sm, 3 on md, 4 on lg
 * - Each card fills the column width
 * - Tight vertical packing, zero JS overhead
 */
export function NewsfeedGrid({ annotations, viewMode = "grid" }: { annotations: UrlAnnotation[], viewMode: 'linear' | 'grid' }) {
  const className = cn(
    "columns-1",
    viewMode === "grid" && "sm:columns-2 md:columns-3 lg:columns-4 gap-4",
  )
  const previewCardClass = cn(
    "w-full p-3",
    viewMode === "grid" && "shadow-md dark:border dark:border-border/50"
  )

  const sortedAnnotations = useMemo(() => {
    return [...annotations].sort((a, b) => {
      if (!a.publishedAt) return 1
      if (!b.publishedAt) return -1
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    })
  }, [annotations])

  return (
    <div className={className}>
      {sortedAnnotations.map((ann, i) => (
        <div key={`item-${i}`} className='break-inside-avoid mb-4'>
          <LinkPreviewCard
            annotation={ann}
            className={previewCardClass}
            clipText={false}
            useWideLayoutIfPossible={true}
            useSmallFontSize={false}
          />
        </div>
      ))}
    </div>
  )
}