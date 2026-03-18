import { memo } from "react"


type WidgetIframeProps = {
  html: string
  className?: string
  title?: string
}


/**
 * Render widget HTML in a sandboxed iframe using srcDoc.
 */
export const WidgetIframe = memo(function WidgetIframe({
  html,
  className,
  title = "Widget preview",
}: WidgetIframeProps) {
  return (
    <iframe
      title={title}
      srcDoc={html}
      sandbox="allow-scripts"
      loading="lazy"
      referrerPolicy="no-referrer"
      className={className}
    />
  )
})
