import React from "react"
import ReactMarkdown, { type Components } from "react-markdown"
import remarkGfm from "remark-gfm"
import rehypeHighlight from "rehype-highlight"
import "katex/dist/katex.min.css"
import "highlight.js/styles/rose-pine-dawn.css"
import { Copy } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

/** -------------------------------------------------------
 *  CustomCodeView — faster copy + lighter layout
 *  - No deep recursion over highlighted spans
 *  - No nested ScrollArea; rely on native overflow
 *  - Stable memoized language label
 *  ------------------------------------------------------*/
interface CustomCodeViewProps {
  className?: string
  children?: React.ReactNode
}

const CustomCodeView: React.FC<CustomCodeViewProps> = ({ className, children }) => {
  const codeRef = React.useRef<HTMLElement>(null)

  // Determine block-ness and language without walking the node tree each render
  const { isBlock, language } = React.useMemo(() => {
    const raw = typeof children === "string" ? children : ""
    const match = /language-(\w+)/.exec(className || "")

    return {
      isBlock: raw.includes("\n"),
      language: match ? match[1] : "plaintext",
    }
  }, [children, className])

  const handleCopy = React.useCallback(() => {
    const text = codeRef.current?.innerText ?? ""
    navigator.clipboard
      .writeText(text)
      .then(() => toast("Copied to clipboard!"))
      .catch(() => toast("Failed to copy!"))
  }, [])

  if (isBlock) {
    return (
      <pre className={cn("text-sm text-mono rounded-2xl bg-card relative my-4 border border-border", className)}>
        <button
          onClick={handleCopy}
          className="transition-all absolute top-1 right-1 text-sm bg-transparent hover:bg-accent p-2 rounded-xl text-accent-foreground"
          aria-label="Copy to clipboard"
        >
          <Copy strokeWidth={1.75} className="size-4 shrink-0" />
        </button>
        <span className="absolute top-0 left-0 w-auto px-4 py-2 text-xs font-mono select-none">
          {language}
        </span>
        <code
          ref={codeRef}
          className="block mt-6 p-4 overflow-x-auto scrollbar-thin scrollbar-thumb-rounded-lg scrollbar-thumb-muted-foreground/50 scrollbar-track-transparent"
        >
          {children}
        </code>
      </pre>
    )
  }

  return (
    <code ref={codeRef} className={cn("text-left text-sm text-mono bg-muted text-muted-foreground rounded-lg px-1", className)}>
      {children}
    </code>
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
 *  Stable markdown components map — avoid remount churn
 *  ------------------------------------------------------*/
const markdownComponents: Components = {
  h1: (props) => (
    <h1
      className="mt-6 scroll-m-20 border-b pb-2 text-xl font-heading font-semibold tracking-tight transition-colors first:mt-0"
      {...props}
    />
  ),
  h2: (props) => (
    <h2 className="mt-4 scroll-m-20 text-lg font-heading font-semibold tracking-tight" {...props} />
  ),
  h3: (props) => (
    <h3 className="mt-4 scroll-m-20 text-base font-heading font-semibold tracking-tight" {...props} />
  ),
  h4: (props) => (
    <h4 className="mt-4 scroll-m-20 text-base font-heading font-semibold tracking-tight" {...props} />
  ),
  p: (props) => <p className="leading-6 [&:not(:first-child)]:mt-6 text-base" {...props} />,
  blockquote: (props) => <blockquote className="mt-4 border-l-2 pl-6 italic text-base" {...props} />,
  ul: (props) => <ul className="my-6 ml-6 list-disc [&>li]:mt-2" {...props} />,
  ol: (props) => <ol className="my-6 ml-6 list-decimal [&>li]:mt-2" {...props} />,
  li: (props) => <li {...props} />,
  a: (props) => <CustomLink {...props} />,
  code: CustomCodeView,
  table: (props) => (
    <div className="my-8 w-full overflow-y-auto">
      <table className="w-full text-base border-b" {...props} />
    </div>
  ),
  tr: (props) => <tr className="m-0 border-t p-0 even:bg-muted" {...props} />,
  th: (props) => (
    <th
      className="border-b px-4 py-2 text-left font-bold [&[align=center]]:text-center [&[align=right]]:text-right"
      {...props}
    />
  ),
  td: (props) => (
    <td className="px-4 py-2 text-left [&[align=center]]:text-center [&[align=right]]:text-right" {...props} />
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
 *  - Stable components map
 *  - Disable auto-detect in highlighting (expensive!)
 *  ------------------------------------------------------*/
export const MarkdownView: React.FC<MarkdownViewProps> = React.memo(
  ({ content }) => {
    // Memoize the large markdown string to avoid re-parsing on parent re-renders
    const memoContent = React.useMemo(() => content, [content])

    return (
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        // Turn off language auto-detection to prevent heavy heuristics.
        rehypePlugins={[[rehypeHighlight, { detect: false, ignoreMissing: true }]]}
        components={markdownComponents}
      >
        {memoContent}
      </ReactMarkdown>
    )
  },
  (prev, next) => prev.content === next.content
)

export default MarkdownView
