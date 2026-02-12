import React from "react"
import { useNavigate } from "@tanstack/react-router"
import { HugeiconsIcon } from "@hugeicons/react"
import { Link02Icon } from "@hugeicons/core-free-icons"

const boardLinkRe = /^\/boards\/([^/]+)\/([^/]+)\/([^/]+)$/

type MarkdownLinkProps = React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  children?: React.ReactNode
}

/**
 * Markdown link renderer that routes internal board URLs through the router.
 * External links keep default browser behavior.
 */
export function MarkdownLink({ children, href, ...rest }: MarkdownLinkProps) {
  const navigate = useNavigate()

  const content = Array.isArray(children) ? children[0] : children
  const label = typeof content === "string" ? content.replace(/^[[]|[\]]$/g, "") : "source"

  const onClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (!href) return
    const match = href.match(boardLinkRe)
    if (!match) return

    event.preventDefault()
    const [, boardId, , targetId] = match
    navigate({
      to: "/boards/$id",
      params: { id: boardId },
      search: (prev: Record<string, unknown>) => ({ ...prev, center_around: targetId }),
    })
  }

  const isExternal = !!href && /^(https?:)?\/\//.test(href)
  const target = isExternal ? "_blank" : rest.target
  const rel = isExternal ? "noreferrer" : rest.rel

  return (
    <a
      href={href}
      target={target}
      rel={rel}
      className="transition-all inline-block leading-none align-text-bottom p-1 text-muted-foreground text-xs font-mono font-medium bg-card hover:bg-accent rounded-lg"
      onClick={onClick}
      {...rest}
    >
      {
        isExternal ? label :
        <HugeiconsIcon icon={Link02Icon} className='size-3' strokeWidth={2} />
      }
    </a>
  )
}
