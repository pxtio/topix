import { useAppStore } from "@/store"
import { usePreviewWebpage } from "../api/preview-link"
import { Skeleton } from "@/components/ui/skeleton"
import { trimText } from "@/lib/common"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"


export function SkeletonCard() {
  return (
    <div className="flex flex-col space-y-3">
      <Skeleton className="h-full w-full rounded-xl" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
      </div>
    </div>
  )
}


export const MiniLinkCard = ({
  url,
  siteName
}: {
  url: string
  siteName: string
}) => {
  return (
    <div className="transition-all p-3 rounded-lg bg-muted hover:bg-accent text-muted-foreground text-xs flex flex-row items-center gap-2">
      <HoverCard>
        <HoverCardTrigger asChild>
          <a className="font-medium inline-block" href={url} target="_blank" rel="noopener noreferrer">
            {trimText(siteName, 30)}
          </a>
        </HoverCardTrigger>
        <HoverCardContent>
          <LinkPreviewCard url={url} />
        </HoverCardContent>
      </HoverCard>
    </div>
  )
}

/**
 * LinkPreviewCard component displays a preview of a webpage link.
 */
export const LinkPreviewCard = ({
  url
}: {
  url: string
}) => {
  const userId = useAppStore((state) => state.userId)
  const {
    data: preview,
    isLoading: loadingPreview
  } = usePreviewWebpage({ userId, url })

  if (loadingPreview) {
    return <SkeletonCard />
  }

  if (!preview) {
    return <div>No preview available for this link.</div>
  }

  const title = trimText(preview.title || '', 50)
  const description = trimText(preview.description || '', 100)
  const siteName = trimText(preview.siteName || url, 30)

  return (
    <div className="flex flex-col space-y-3">
      <div className="space-y-2">
        <h4 className="text-sm font-semibold">{title}</h4>
        <p className="text-xs">{description}</p>
        <a
          className="flex flex-row items-center gap-2 text-xs text-muted-foreground font-medium"
          href={url}
          target="_blank"
          rel="noopener noreferrer"
        >
          {preview.favicon && <img src={preview.favicon} alt="Favicon" className="h-4 w-4 shrink-0 rounded-full" />}
          {siteName && <span className="">{siteName}</span>}
        </a>
      </div>
    </div>
  )
}