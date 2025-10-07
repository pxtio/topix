import { trimText } from "@/lib/common"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import type { UrlAnnotation } from "../types/tool-outputs"
import { extractMainDomain } from "../utils/url"
import { HugeiconsIcon } from "@hugeicons/react"
import { Link02Icon } from "@hugeicons/core-free-icons"
import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { formatNewsletterDate } from "@/features/newsfeed/utils/date"


// MiniLinkCard component displays a compact link card with a hover preview.
export const MiniLinkCard = ({
  annotation
}: {
  annotation: UrlAnnotation
}) => {
  const domain = extractMainDomain(annotation.url) || annotation.url

  const trimmedTitle = trimText(annotation.title || "", 10)
  const trimmedDomain = trimText(domain, 20)

  const linkLabel = trimmedTitle ? `${trimmedTitle} - ${trimmedDomain}` : trimmedDomain

  return (
    <div className="transition-all px-2 py-1 rounded-lg border border-border bg-card hover:bg-accent text-muted-foreground text-xs flex flex-row items-center gap-1">
      <HoverCard>
        <HoverCardTrigger asChild>
          <a className="font-mono font-medium flex flex-row items-center gap-1" href={annotation.url} target="_blank" rel="noopener noreferrer">
            {
              annotation.favicon && (
                <img src={annotation.favicon} alt="favicon" className="size-3 rounded-sm object-cover" />
              )
            }
            <span>{linkLabel}</span>
          </a>
        </HoverCardTrigger>
        <HoverCardContent className='p-0 shadow-lg border border-border w-auto rounded-lg overflow-hidden' sideOffset={8}>
          <LinkPreviewCard
            annotation={annotation}
          />
        </HoverCardContent>
      </HoverCard>
    </div>
  )
}

/**
 * LinkPreviewCard component displays a preview of a webpage link.
 */
export const LinkPreviewCard = ({
  annotation,
  className = undefined,
  clipText = true,
  useWideLayoutIfPossible = false,
  useSmallFontSize = true
}: {
  annotation: UrlAnnotation
  className?: string
  clipText?: boolean
  useWideLayoutIfPossible?: boolean
  useSmallFontSize?: boolean
}) => {
  const { url, title, content, favicon, coverImage, tags = [], publishedAt } = annotation
  const name = extractMainDomain(url) || url
  const description = content || ""

  // cover image state
  const [coverLoaded, setCoverLoaded] = useState(false)
  const [coverOk, setCoverOk] = useState(Boolean(coverImage))

  // favicon state
  const [favLoaded, setFavLoaded] = useState(false)
  const [favOk, setFavOk] = useState(Boolean(favicon))

  // responsive: move image right when card is wide
  const rootRef = useRef<HTMLAnchorElement | null>(null)
  const [wideLayout, setWideLayout] = useState(false) // true if width >= 300

  useEffect(() => {
    if (!rootRef.current) return
    const el = rootRef.current
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) {
        setWideLayout(e.contentRect.width >= 300 && !!coverImage && coverOk && useWideLayoutIfPossible)
      }
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [coverImage, coverOk, useWideLayoutIfPossible])

  const clName = cn(
    "transition-all rounded-lg p-2 cursor-pointer bg-card hover:bg-accent hover:shadow-md block w-40",
    className
  )

  const MAX_TAGS = 3
  const shownTags = tags.slice(0, MAX_TAGS)
  const extraCount = Math.max(0, tags.length - shownTags.length)

  const CoverImage = () =>
    coverImage && coverOk ? (
      <div
        className={cn(
          "overflow-hidden bg-muted rounded-sm shrink-0",
          wideLayout ? "w-32 h-28" : "w-full h-24"
        )}
      >
        <img
          src={coverImage}
          alt="cover"
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onLoad={() => setCoverLoaded(true)}
          onError={() => setCoverOk(false)}
          className={cn("w-full h-full object-cover", coverLoaded ? "visible" : "invisible")}
        />
      </div>
    ) : null

  return (
    <a
      ref={rootRef}
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={clName}
    >
      <div className={cn("space-y-2", wideLayout && "space-y-0")}>
        <div className={cn(wideLayout ? "flex items-start gap-3" : "block space-y-1")}>
          {!wideLayout && <CoverImage />}

          <div
            className={cn(
              "min-w-0",
              wideLayout && "flex-1",
              useSmallFontSize ? "space-y-1" : "space-y-2"
            )}
          >
            {/* --- NEW: Published Date --- */}
            {publishedAt && (
              <p
                className={cn(
                  "text-muted-foreground",
                  useSmallFontSize ? "text-[0.65rem]" : "text-xs"
                )}
              >
                {formatNewsletterDate(publishedAt)}
              </p>
            )}

            <h4
              className={cn(
                "font-medium w-full",
                clipText && "truncate",
                useSmallFontSize ? "text-sm" : "text-base"
              )}
            >
              {title}
            </h4>

            {description && (
              <p
                className={cn(
                  "w-full",
                  clipText && "truncate",
                  useSmallFontSize ? "text-xs" : "text-sm"
                )}
              >
                {description}
              </p>
            )}

            {tags.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {shownTags.map((t) => (
                  <Badge
                    key={t}
                    variant="outline"
                    className={cn(
                      "rounded-full",
                      useSmallFontSize ? "text-[0.6rem] py-0.5" : "text-xs py-1"
                    )}
                  >
                    {t}
                  </Badge>
                ))}
                {extraCount > 0 && (
                  <Badge
                    variant="outline"
                    className={cn(
                      "rounded-md",
                      useSmallFontSize ? "text-[0.6rem] py-0.5" : "text-xs py-1"
                    )}
                  >
                    {`+${extraCount}`}
                  </Badge>
                )}
              </div>
            )}

            <div className="mt-1 flex flex-row items-center gap-1 text-xs text-muted-foreground font-medium font-mono">
              {favOk && favicon ? (
                <img
                  src={favicon}
                  alt="favicon"
                  loading="lazy"
                  decoding="async"
                  referrerPolicy="no-referrer"
                  onLoad={() => setFavLoaded(true)}
                  onError={() => setFavOk(false)}
                  className={cn(
                    "size-3 rounded-sm object-cover",
                    favLoaded ? "visible" : "invisible"
                  )}
                />
              ) : (
                <HugeiconsIcon icon={Link02Icon} className="size-3" strokeWidth={1.75} />
              )}
              {name && <span className={cn(clipText && "truncate")}>{name}</span>}
            </div>
          </div>

          {wideLayout && <CoverImage />}
        </div>
      </div>
    </a>
  )
}