import { trimText } from "@/lib/common"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import type { UrlAnnotation } from "../types/tool-outputs"
import { extractMainDomain } from "../utils/url"
import { HugeiconsIcon } from "@hugeicons/react"
import { Link02Icon } from "@hugeicons/core-free-icons"


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
            url={annotation.url}
            siteName={domain}
            title={annotation.title}
            content={annotation.content}
            favicon={annotation.favicon}
            coverImage={annotation.coverImage}
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
  url,
  siteName = undefined,
  title = undefined,
  content = undefined,
  favicon = undefined,
  coverImage = undefined
}: {
  url: string
  siteName?: string
  title?: string
  content?: string
  favicon?: string
  coverImage?: string
}) => {
  const name = siteName || extractMainDomain(url) || url
  const description = content || ''

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="transition-all rounded-lg p-2 cursor-pointer bg-card hover:bg-accent hover:shadow-md w-40 block"
    >
      <div className="space-y-2">
        {coverImage && (
          <div className="w-full h-20 rounded-md overflow-hidden bg-muted">
            <img src={coverImage} alt="cover" className="w-full h-full object-cover" />
          </div>
        )}
        <h4 className="text-sm font-medium w-full truncate">{title}</h4>
        <span className="text-xs w-full truncate">{description}</span>
        <div className="flex flex-row items-center gap-1 text-xs text-muted-foreground font-medium font-mono">
          {favicon ? (
            <img src={favicon} alt="favicon" className="size-3 rounded-sm object-cover" />
          ) : (
            <HugeiconsIcon icon={Link02Icon} className="size-3" strokeWidth={1.75} />
          )}
          {name && <span className="truncate">{name}</span>}
        </div>
      </div>
    </a>
  )
}