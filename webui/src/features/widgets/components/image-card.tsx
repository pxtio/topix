import { useEffect, useMemo, useRef, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { ExternalLink } from 'lucide-react'
import type { WebPhoto } from '@/features/board/api/types'
import { useSearchImages, type ImageSearchEngine } from '@/features/board/api/image-search'

type Props = {
  query: string
  /** fixed row height for the preview strip (px) */
  rowHeight?: number
  /** max images to preload aspect ratios for (to keep it snappy) */
  preloadMax?: number
  /** optional title above the dialog grid */
  title?: string
  /** override search engine if needed; default 'linkup' for this widget */
  engine?: ImageSearchEngine
}

export default function ImageSearchStrip({
  query,
  rowHeight = 160,
  preloadMax = 24,
  title = 'Images',
  engine = 'serper'
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [open, setOpen] = useState(false)
  const [ratios, setRatios] = useState<Map<string, number>>(new Map()) // url -> aspect ratio (w/h)

  // fetch images via react-query
  const { data: photos = [], isPending, isError } = useSearchImages({ query, engine })

  // preload aspect ratios for first N photos
  useEffect(() => {
    let cancelled = false
    const cache = new Map<string, number>()

    const toLoad = photos.slice(0, preloadMax)

    const loadOne = (p: WebPhoto) =>
      new Promise<void>(resolve => {
        const img = new Image()
        img.onload = () => {
          if (!cancelled) {
            const ar =
              img.naturalWidth > 0 && img.naturalHeight > 0
                ? img.naturalWidth / img.naturalHeight
                : 1
            cache.set(p.url, Math.max(0.2, Math.min(ar || 1, 5))) // clamp outliers
            setRatios(new Map(cache))
          }
          resolve()
        }
        img.onerror = () => {
          if (!cancelled) {
            cache.set(p.url, 1) // fallback square
            setRatios(new Map(cache))
          }
          resolve()
        }
        img.referrerPolicy = 'no-referrer'
        img.src = p.url
      })

    ;(async () => {
      for (const p of toLoad) await loadOne(p)
    })()

    return () => {
      cancelled = true
    }
  }, [photos, preloadMax])

  // choose how many to show in the strip (rest go behind +N)
  const { visible, hiddenCount } = useMemo(() => {
    const maxStrip = 4
    const visible = photos.slice(0, maxStrip)
    const hiddenCount = Math.max(0, photos.length - visible.length)
    return { visible, hiddenCount }
  }, [photos])

  // if loading, error, empty query, or no images → show nothing
  if (!query || isPending || isError || photos.length === 0) return null

  const openNewTab = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const fewImages = visible.length <= 2

  return (
    <div className='w-full'>
      {/* Strip */}
      <div ref={containerRef} className='w-full overflow-hidden'>
        <div
          className={`flex items-stretch gap-2 ${
            fewImages ? 'justify-center' : 'justify-start'
          }`}
        >
          {visible.map((p, idx) => {
            const ar = ratios.get(p.url) ?? 1
            const width = Math.round(rowHeight * ar)
            const isLast = idx === visible.length - 1
            const showOverlayCounter = isLast && hiddenCount > 0

            return (
              <div
                key={p.url + idx}
                className='relative group rounded-lg overflow-hidden border border-border bg-muted/20 flex-shrink-0'
                style={{ height: rowHeight, width }}
              >
                <button
                  type='button'
                  onClick={() => openNewTab(p.url)}
                  className='absolute inset-0'
                  aria-label={p.description || 'Open image'}
                  title='Open in new tab'
                />
                <img
                  src={p.url}
                  alt={p.description || 'web photo'}
                  referrerPolicy='no-referrer'
                  className='h-full w-full object-cover'
                />
                {/* external icon on hover */}
                <div className='pointer-events-none absolute right-1.5 top-1.5 opacity-0 group-hover:opacity-100 transition-opacity'>
                  <ExternalLink className='w-3.5 h-3.5 text-foreground/80 drop-shadow' />
                </div>

                {showOverlayCounter && (
                  <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                      <button
                        type='button'
                        className='absolute inset-0 bg-background/60 backdrop-blur-[1px] text-foreground text-sm font-medium'
                        title={`View ${hiddenCount} more`}
                      >
                        <span className='absolute inset-0 flex items-center justify-center'>
                          + {hiddenCount}
                        </span>
                      </button>
                    </DialogTrigger>
                    <DialogContent className='max-w-5xl'>
                      <DialogHeader>
                        <DialogTitle className='text-base'>{title}</DialogTitle>
                      </DialogHeader>
                      <ImagesGrid photos={photos} onOpen={openNewTab} />
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function ImagesGrid({
  photos,
  onOpen
}: {
  photos: WebPhoto[]
  onOpen: (url: string) => void
}) {
  return (
    <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2'>
      {photos.map((p, i) => (
        <div
          key={p.url + i}
          className='group relative rounded-md overflow-hidden border border-border bg-muted/20'
        >
          <button
            type='button'
            onClick={() => onOpen(p.url)}
            className='absolute inset-0'
            aria-label={p.description || 'Open image'}
            title='Open in new tab'
          />
          <img
            src={p.url}
            alt={p.description || 'web photo'}
            className='h-40 w-full object-cover'
            referrerPolicy='no-referrer'
          />
          {p.description && (
            <div className='absolute bottom-0 left-0 right-0 bg-black/45 text-white text-[11px] px-2 py-1 line-clamp-2'>
              {p.description}
            </div>
          )}
          <div className='pointer-events-none absolute right-1.5 top-1.5 opacity-0 group-hover:opacity-100 transition-opacity'>
            <ExternalLink className='w-3.5 h-3.5 text-white/90 drop-shadow' />
          </div>
        </div>
      ))}
    </div>
  )
}