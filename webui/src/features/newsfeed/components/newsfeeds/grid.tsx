// src/features/newsfeed/components/newsfeeds/grid-masonry.tsx
import type { UrlAnnotation } from '@/features/agent/types/tool-outputs'
import { LinkPreviewCard } from '@/features/agent/components/link-preview'

/**
 * Masonry using CSS columns:
 * - 1 col on mobile, 2 on sm, 3 on md, 4 on lg
 * - Each card fills the column width
 * - Tight vertical packing, zero JS overhead
 */
export function NewsfeedGrid({ annotations }: { annotations: UrlAnnotation[] }) {
  return (
    <div className='columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-4'>
      {annotations.map((ann, i) => (
        <div key={ann.url || `item-${i}`} className='break-inside-avoid mb-4'>
          <LinkPreviewCard annotation={ann} className='w-full' />
        </div>
      ))}
    </div>
  )
}