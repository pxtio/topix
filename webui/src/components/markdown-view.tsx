import React from "react"
import ReactMarkdown, { type Components } from "react-markdown"
import remarkGfm from "remark-gfm"
import rehypeHighlight from "rehype-highlight"
import "katex/dist/katex.min.css"
import "highlight.js/styles/rose-pine-dawn.css"
import { Copy } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"


interface CustomCodeViewProps {
  className?: string
  inline?: boolean
  children?: React.ReactNode
}

let __ccvStyleInjected = false

export const CustomCodeView: React.FC<CustomCodeViewProps> = ({ className, inline, children }) => {
  const codeRef = React.useRef<HTMLElement>(null)

  // inject once: transparent track + thin thumb (works without Tailwind scrollbar plugin)
  React.useEffect(() => {
    if (__ccvStyleInjected) return
    const style = document.createElement("style")
    style.setAttribute("data-ccv", "true")
    style.innerHTML = `
      .ccv-scroll { scrollbar-width: thin; scrollbar-color: rgba(120,120,130,.5) transparent; }
      .ccv-scroll::-webkit-scrollbar { height: 10px; }
      .ccv-scroll::-webkit-scrollbar-track { background: transparent; }
      .ccv-scroll::-webkit-scrollbar-thumb { background: rgba(120,120,130,.5); border-radius: 9999px; }
      .ccv-scroll::-webkit-scrollbar-thumb:hover { background: rgba(120,120,130,.7); }
    `
    document.head.appendChild(style)
    __ccvStyleInjected = true
  }, [])

  const { isBlock, language } = React.useMemo(() => {
    const match = /language-([\w-]+)/.exec(className || "")
    return {
      isBlock: !inline,
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
          // layout: let container shrink; do not create page-wide overflow
          "relative my-4 w-full min-w-0",
          // visuals
          "rounded-2xl bg-card text-sm text-mono border border-border",
          // important: let inner <code> handle horizontal scrolling
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
            "ccv-scroll block mt-6 p-4 w-full min-w-0",
            // horizontal scroll is confined to the code area
            "overflow-x-auto",
            // preserve formatting; allow long tokens to extend and be scrollable
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

/** -------------------------------------------------------
 *  Responsive-first markdown components
 *  ------------------------------------------------------*/
const markdownComponents: Components = {
  h1: (props) => (
    <h1
      className="mt-7 scroll-m-20 border-b pb-2 text-2xl font-heading font-semibold tracking-tight transition-colors first:mt-0"
      {...props}
    />
  ),
  h2: (props) => <h2 className="mt-6 scroll-m-20 text-xl font-heading font-semibold tracking-tight" {...props} />,
  h3: (props) => <h3 className="mt-5 scroll-m-20 text-lg font-heading font-semibold tracking-tight" {...props} />,
  h4: (props) => <h4 className="mt-4 scroll-m-20 text-base font-heading font-semibold tracking-tight" {...props} />,

  p: (props) => (
    <p
      className="
        leading-7 text-base [&:not(:first-child)]:mt-4
        break-words whitespace-normal
        min-w-0
      "
      {...props}
    />
  ),

  blockquote: (props) => <blockquote className="mt-4 border-l-2 pl-6 italic text-base" {...props} />,

  ul: (props) => (
    <ul
      className="
        my-6 ml-6 list-disc [&>li]:mt-2
        break-words whitespace-normal
        min-w-0
      "
      {...props}
    />
  ),
  ol: (props) => (
    <ol
      className="
        my-6 ml-6 list-decimal [&>li]:mt-2
        break-words whitespace-normal
        min-w-0
      "
      {...props}
    />
  ),
  li: (props) => <li className="break-words min-w-0" {...props} />,
  a: (props) => <CustomLink {...props} />,
  code: CustomCodeView,

  // responsive images (scale down, never overflow)
  img: (props) => (
    <img
      {...props}
      className={cn("max-w-full h-auto rounded-lg my-4", props.className)}
      style={{ ...(props.style || {}), height: "auto", maxWidth: "100%" }}
      alt={props.alt || ""}
    />
  ),

  // horizontally scrollable tables with transparent scrollbar track
  table: (props) => (
    <div
      className="
        my-6 w-full max-w-full
        overflow-x-auto overflow-y-hidden
        overscroll-x-contain
        scrollbar-thin scrollbar-thumb-rounded-lg
        scrollbar-thumb-muted-foreground/40 scrollbar-track-transparent
      "
    >
      <table
        className="
          text-base border-b
          w-max max-w-none
          min-w-[480px] md:min-w-[640px]
        "
        {...props}
      />
    </div>
  ),
  tr: (props) => <tr className="m-0 border-t p-0 even:bg-muted" {...props} />,
  th: (props) => (
    <th
      className="
        border-b px-4 py-2 text-left font-bold
        [&[align=center]]:text-center [&[align=right]]:text-right
        whitespace-nowrap
      "
      {...props}
    />
  ),
  td: (props) => (
    <td
      className="
        px-4 py-2 text-left
        [&[align=center]]:text-center [&[align=right]]:text-right
        align-top
        break-words
      "
      {...props}
    />
  ),
  b: (props) => <b className="font-semibold" {...props} />,
  strong: (props) => <strong className="font-semibold" {...props} />,
  em: (props) => <em className="italic" {...props} />,
  del: (props) => <del className="line-through" {...props} />,
}

/** -------------------------------------------------------
 *  Props
 *  ------------------------------------------------------*/
export interface MarkdownViewProps {
  content: string
}

/** -------------------------------------------------------
 *  MarkdownView — memoized by content
 *  ------------------------------------------------------*/
export const MarkdownView: React.FC<MarkdownViewProps> = React.memo(
  ({ content }) => {
    const memoContent = React.useMemo(() => content, [content])

    return (
      <div className="w-full min-w-0">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[[rehypeHighlight, { detect: false, ignoreMissing: true }]]}
          components={markdownComponents}
        >
          {memoContent}
        </ReactMarkdown>
      </div>
    )
  },
  (prev, next) => prev.content === next.content
)

export default MarkdownView