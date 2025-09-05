import React from "react"
import ReactMarkdown, { type Components } from "react-markdown"
import remarkGfm from "remark-gfm"
import rehypeHighlight from "rehype-highlight"
import "katex/dist/katex.min.css"
import "highlight.js/styles/rose-pine-dawn.css"
import { Copy } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { CustomTable } from "./custom-table"
import type { PluggableList } from 'unified'
import { useRafThrottledString } from "@/features/agent/hooks/throttle-string"


/** -------------------------------------------------------
 *  one-time transparent scrollbar styles (for code + tables)
 *  ------------------------------------------------------*/
let __mkScrollbarInjected = false
function ensureScrollbarStyleInjected() {
  if (__mkScrollbarInjected) return
  const style = document.createElement("style")
  style.setAttribute("data-mk-scrollbars", "true")
  style.innerHTML = `
    /* firefox */
    .mk-scroll { scrollbar-width: thin; scrollbar-color: rgba(120,120,130,.5) transparent; }
    /* webkit */
    .mk-scroll::-webkit-scrollbar { height: 10px; width: 10px; }
    .mk-scroll::-webkit-scrollbar-track { background: transparent; }
    .mk-scroll::-webkit-scrollbar-thumb { background: rgba(120,120,130,.5); border-radius: 9999px; }
    .mk-scroll::-webkit-scrollbar-thumb:hover { background: rgba(120,120,130,.7); }
  `
  document.head.appendChild(style)
  __mkScrollbarInjected = true
}

/** -------------------------------------------------------
 *  CustomCodeView — responsive, transparent scrollbar
 *  ------------------------------------------------------*/
interface CustomCodeViewProps {
  className?: string
  inline?: boolean
  children?: React.ReactNode
}

export const CustomCodeView: React.FC<CustomCodeViewProps> = ({ className, inline, children }) => {
  const codeRef = React.useRef<HTMLElement>(null)

  React.useEffect(() => {
    ensureScrollbarStyleInjected()
  }, [])

  // Treat as block ONLY when react-markdown marks inline === false,
  // or when a syntax class "language-..." is present (fenced code).
  const { isBlock, language } = React.useMemo(() => {
    const hasLang = /language-([\w-]+)/.test(className || "")
    const match = /language-([\w-]+)/.exec(className || "")
    return {
      isBlock: inline === false || hasLang,
      language: match ? match[1] : "plaintext"
    }
  }, [className, inline])

  const handleCopy = React.useCallback(() => {
    const text = codeRef.current?.textContent ?? ""
    navigator.clipboard
      .writeText(text)
      .then(() => toast("Copied to clipboard!"))
      .catch(() => toast("Failed to copy!"))
  }, [])

  if (!isBlock) {
    return (
      <code
        ref={codeRef}
        className={cn(
          "text-left text-sm text-mono bg-muted text-muted-foreground rounded-lg px-1",
          className
        )}
      >
        {children}
      </code>
    )
  }

  return (
    <div className="w-full min-w-0">
      <pre
        className={cn(
          "relative my-4 w-full min-w-0",
          "rounded-2xl !bg-card text-sm text-mono border border-border",
          "overflow-visible",
          className
        )}
      >
        <button
          onClick={handleCopy}
          className="transition-all absolute top-1 right-1 text-sm bg-transparent hover:bg-accent p-2 rounded-xl text-accent-foreground"
          aria-label="Copy to clipboard"
          type="button"
        >
          <Copy strokeWidth={1.75} className="size-4 shrink-0" />
        </button>

        <span className="absolute top-0 left-0 w-auto px-4 py-2 text-xs font-mono select-none">
          {language}
        </span>

        <code
          ref={codeRef}
          className={cn(
            "mk-scroll block mt-6 p-4 w-full min-w-0",
            "overflow-x-auto",
            "whitespace-pre break-words"
          )}
        >
          {children}
        </code>
      </pre>
    </div>
  )
}

/** -------------------------------------------------------
 *  CustomLink — stable and lightweight
 *  ------------------------------------------------------*/
interface CustomLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  isStreaming?: boolean
  children?: React.ReactNode
}

const CustomLink: React.FC<CustomLinkProps> = ({ children, ...props }) => {
  const content = Array.isArray(children) ? children[0] : children
  const contentWithoutBrackets = typeof content === "string" ? content.replace(/^[[]|[\]]$/g, "") : "KB"

  const aClass =
    "transition-all inline-block px-2 py-1 text-muted-foreground text-xs font-mono font-medium border border-border bg-card hover:bg-accent rounded-lg"

  return (
    <a href={props.href} className={aClass} target="_blank" rel="noreferrer">
      {contentWithoutBrackets}
    </a>
  )
}

/** lightweight code block for streaming (no copy button, no badge) */
const LightCode: React.FC<CustomCodeViewProps> = ({ className, inline, children }) => {
  const isBlock = inline === false || /language-/.test(className || "")
  if (!isBlock) {
    return <code className={cn("text-left text-sm text-mono bg-muted text-muted-foreground rounded-lg px-1", className)}>{children}</code>
  }
  return (
    <pre className={cn("my-4 w-full min-w-0 rounded-2xl !bg-card text-sm text-mono border border-border overflow-x-auto", className)}>
      <code className="block p-4 whitespace-pre break-words">{children}</code>
    </pre>
  )
}

const baseComponents: Components = {
  h1: p => <h1 className="mt-7 scroll-m-20 border-b pb-2 text-2xl font-heading font-semibold tracking-tight first:mt-0" {...p} />,
  h2: p => <h2 className="mt-6 scroll-m-20 text-xl font-heading font-semibold tracking-tight" {...p} />,
  h3: p => <h3 className="mt-5 scroll-m-20 text-lg font-heading font-semibold tracking-tight" {...p} />,
  h4: p => <h4 className="mt-4 scroll-m-20 text-base font-heading font-semibold tracking-tight" {...p} />,
  p:  p => <p className="leading-7 text-base [&:not(:first-child)]:mt-4 break-words whitespace-normal min-w-0" {...p} />,
  blockquote: p => <blockquote className="mt-4 border-l-2 pl-6 italic text-base" {...p} />,
  ul: p => <ul className="my-6 ml-6 list-disc [&>li]:mt-2 break-words whitespace-normal min-w-0" {...p} />,
  ol: p => <ol className="my-6 ml-6 list-decimal [&>li]:mt-2 break-words whitespace-normal min-w-0" {...p} />,
  li: p => <li className="break-words min-w-0" {...p} />,
  img: p => <img {...p} className={cn("max-w-full h-auto rounded-lg my-4", p.className)} style={{ ...(p.style || {}), height: "auto", maxWidth: "100%" }} alt={p.alt || ""} />,
  table: p => <CustomTable {...p} />,
  tr: p => <tr className="m-0 border-t p-0 even:bg-muted" {...p} />,
  th: p => <th className="border-b px-4 py-2 text-left font-bold [&[align=center]]:text-center [&[align=right]]:text-right whitespace-nowrap" {...p} />,
  td: p => <td className="px-4 py-2 text-left [&[align=center]]:text-center [&[align=right]]:text-right align-top break-words" {...p} />,
  b:  p => <b className="font-semibold" {...p} />,
  strong: p => <strong className="font-semibold" {...p} />,
  em: p => <em className="italic" {...p} />,
  del: p => <del className="line-through" {...p} />
}

export interface MarkdownViewProps {
  content: string
  isStreaming?: boolean
}

export const MarkdownView: React.FC<MarkdownViewProps> = React.memo(
  ({ content, isStreaming = false }) => {
    // throttle + defer
    const throttled = useRafThrottledString(content, isStreaming)
    const deferred = React.useDeferredValue(throttled)

    // choose code renderer + highlighting based on stream state
    const components = React.useMemo<Components>(() => ({
      ...baseComponents,
      code: isStreaming ? LightCode : CustomCodeView,
      a: (props) => <CustomLink {...props} />
    }), [isStreaming])

    const rehypePlugins = React.useMemo<PluggableList>(() => {
      return isStreaming ? [] : [[rehypeHighlight, { detect: false, ignoreMissing: true }]]
    }, [isStreaming])

    return (
      <div className="w-full min-w-0">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={rehypePlugins}
          components={components}
        >
          {deferred}
        </ReactMarkdown>
      </div>
    )
  },
  // skip re-render if both content + streaming flag are unchanged
  (prev, next) => prev.content === next.content && prev.isStreaming === next.isStreaming
)