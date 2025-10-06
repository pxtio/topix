import { trimText } from "@/lib/common"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import type { UrlAnnotation } from "../types/tool-outputs"
import { extractMainDomain } from "../utils/url"
import { HugeiconsIcon } from "@hugeicons/react"
import { Link02Icon } from "@hugeicons/core-free-icons"
import { useState } from "react"


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
const cn = (...xs: (string | false | undefined)[]) => xs.filter(Boolean).join(" ")

export const LinkPreviewCard = ({ annotation, className = undefined }: { annotation: UrlAnnotation, className?: string }) => {
  const { url, title, content, favicon, coverImage } = annotation
  const name = extractMainDomain(url) || url
  const description = content || ""

  // cover image state
  const [coverLoaded, setCoverLoaded] = useState(false)
  const [coverOk, setCoverOk] = useState(Boolean(coverImage))

  // favicon state
  const [favLoaded, setFavLoaded] = useState(false)
  const [favOk, setFavOk] = useState(Boolean(favicon))

  const clName = cn("transition-all rounded-lg p-2 cursor-pointer bg-card hover:bg-accent hover:shadow-md w-40 block", className)

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={clName}
    >
      <div className="space-y-2">
        {/* COVER */}
        {coverImage && coverOk && (
          <div className="w-full h-20 rounded-sm overflow-hidden bg-muted">
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
        )}

        <h4 className="text-sm font-medium w-full truncate">{title}</h4>
        {description && <p className="text-xs w-full truncate">{description}</p>}

        {/* DOMAIN + FAVICON */}
        <div className="flex flex-row items-center gap-1 text-xs text-muted-foreground font-medium font-mono">
          {favOk && favicon ? (
            <img
              src={favicon}
              alt="favicon"
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
              onLoad={() => setFavLoaded(true)}
              onError={() => setFavOk(false)}
              className={cn("size-3 rounded-sm object-cover", favLoaded ? "visible" : "invisible")}
            />
          ) : (
            <HugeiconsIcon icon={Link02Icon} className="size-3" strokeWidth={1.75} />
          )}
          {name && <span className="truncate">{name}</span>}
        </div>
      </div>
    </a>
  )
}