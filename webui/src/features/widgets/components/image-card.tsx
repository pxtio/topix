import { useEffect, useMemo, useRef, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { ExternalLink } from 'lucide-react'

type Props = {
  images: string[] // array of image URLs
  /** fixed row height for the preview strip (px) */
  rowHeight?: number
  /** max images to preload aspect ratios for (to keep it snappy) */
  preloadMax?: number
  /** optional title above the dialog grid */
  title?: string
}

export default function ImageSearchStrip({
  images,
  rowHeight = 160,
  preloadMax = 24,
  title = 'Images',
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [open, setOpen] = useState(false)
  const [ratios, setRatios] = useState<Map<string, number>>(new Map()) // url -> aspect ratio (w/h)
  const [brokenUrls, setBrokenUrls] = useState<Set<string>>(new Set())

  // helper: mark an URL as broken (used by preload + <img onError>)
  const markBroken = (url: string) => {
    setBrokenUrls(prev => {
      if (prev.has(url)) return prev
      const next = new Set(prev)
      next.add(url)
      return next
    })
  }

  // filter out broken ones everywhere
  const safePhotos = useMemo(
    () => images.filter(url => !brokenUrls.has(url)),
    [images, brokenUrls]
  )

  // preload aspect ratios for first N safe photos
  useEffect(() => {
    let cancelled = false
    const cache = new Map<string, number>()

    const toLoad = safePhotos.slice(0, preloadMax)

    const loadOne = (url: string) =>
      new Promise<void>(resolve => {
        const img = new Image()
        img.onload = () => {
          if (!cancelled) {
            const ar =
              img.naturalWidth > 0 && img.naturalHeight > 0
                ? img.naturalWidth / img.naturalHeight
                : 1
            cache.set(url, Math.max(0.2, Math.min(ar || 1, 5))) // clamp outliers
            setRatios(new Map(cache))
          }
          resolve()
        }
        img.onerror = () => {
          if (!cancelled) {
            markBroken(url)
          }
          resolve()
        }
        img.referrerPolicy = 'no-referrer'
        img.src = url
      })

    ;(async () => {
      for (const url of toLoad) await loadOne(url)
    })()

    return () => {
      cancelled = true
    }
  }, [safePhotos, preloadMax])

  // choose how many to show in the strip (rest go behind +N)
  const { visible, hiddenCount } = useMemo(() => {
    const maxStrip = 4
    const visible = safePhotos.slice(0, maxStrip)
    const hiddenCount = Math.max(0, safePhotos.length - visible.length)
    return { visible, hiddenCount }
  }, [safePhotos])

  // if no valid images, render nothing
  if (safePhotos.length === 0) return null

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
          {visible.map((url, idx) => {
            const ar = ratios.get(url) ?? 1
            const width = Math.round(rowHeight * ar)
            const isLast = idx === visible.length - 1
            const showOverlayCounter = isLast && hiddenCount > 0

            return (
              <div
                key={url + idx}
                className='relative group rounded-lg overflow-hidden border border-border bg-muted/20 flex-shrink-0'
                style={{ height: rowHeight, width }}
              >
                <button
                  type='button'
                  onClick={() => openNewTab(url)}
                  className='absolute inset-0'
                  aria-label={'Open image'}
                  title='Open in new tab'
                />
                <img
                  src={url}
                  alt={'web photo'}
                  referrerPolicy='no-referrer'
                  className='h-full w-full object-cover'
                  onError={() => markBroken(url)} // <-- strip-level safeguard
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
                      <ImagesGrid images={safePhotos} onOpen={openNewTab} />
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
  images,
  onOpen
}: {
  images: string[]
  onOpen: (url: string) => void
}) {
  return (
    <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2'>
      {images.map((url, i) => (
        <div
          key={url + i}
          className='group relative rounded-md overflow-hidden border border-border bg-muted/20'
        >
          <button
            type='button'
            onClick={() => onOpen(url)}
            className='absolute inset-0'
            aria-label={'Open image'}
            title='Open in new tab'
          />
          <img
            src={url}
            alt={'web photo'}
            className='h-40 w-full object-cover'
            referrerPolicy='no-referrer'
          />
          <div className='pointer-events-none absolute right-1.5 top-1.5 opacity-0 group-hover:opacity-100 transition-opacity'>
            <ExternalLink className='w-3.5 h-3.5 text-white/90 drop-shadow' />
          </div>
        </div>
      ))}
    </div>
  )
}