import React from "react"
import type { Components } from "react-markdown"
import "katex/dist/katex.min.css"
import { cn } from "@/lib/utils"
import { CustomTable } from "./custom-table"
import { Pre } from "./custom-pre"
import { Streamdown } from "streamdown"

import remarkMath from "remark-math"
import rehypeKatex from "rehype-katex"

/** -------------------------------------------------------
 *  transparent scrollbars
 *  ------------------------------------------------------*/
let __mkScrollbarInjected = false
function ensureScrollbarStyleInjected() {
  if (__mkScrollbarInjected) return
  const style = document.createElement("style")
  style.setAttribute("data-mk-scrollbars", "true")
  style.innerHTML = `
    .mk-scroll { scrollbar-width: thin; scrollbar-color: rgba(120,120,130,.5) transparent; }
    .mk-scroll::-webkit-scrollbar { height: 10px; width: 10px; }
    .mk-scroll::-webkit-scrollbar-track { background: transparent; }
    .mk-scroll::-webkit-scrollbar-thumb { background: rgba(120,120,130,.5); border-radius: 9999px; }
    .mk-scroll::-webkit-scrollbar-thumb:hover { background: rgba(120,120,130,.7); }
  `
  document.head.appendChild(style)
  __mkScrollbarInjected = true
}

/** -------------------------------------------------------
 *  Custom components (unchanged)
 *  ------------------------------------------------------*/
function CustomLink({ children, href, ...rest }: React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  const content = Array.isArray(children) ? children[0] : children
  const label = typeof content === "string" ? content.replace(/^[[]|[\]]$/g, "") : "KB"

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="transition-all inline-block px-2 py-1 text-muted-foreground text-xs font-mono font-medium border border-border bg-card hover:bg-accent rounded-lg"
      {...rest}
    >
      {label}
    </a>
  )
}

const components = {
  h1: (p) => <h1 className="mt-7 scroll-m-20 pb-2 text-2xl font-heading font-medium tracking-tight first:mt-0" {...p} />,
  h2: (p) => <h2 className="mt-6 scroll-m-20 text-xl font-heading font-medium tracking-tight" {...p} />,
  h3: (p) => <h3 className="mt-5 scroll-m-20 text-lg font-heading font-medium tracking-tight" {...p} />,
  h4: (p) => <h4 className="mt-4 scroll-m-20 text-base font-heading font-medium tracking-tight" {...p} />,
  p: (p) => (
    <p
      className="leading-7 text-base [&:not(:first-child)]:mt-4 break-words whitespace-normal min-w-0"
      {...p}
    />
  ),
  blockquote: (p) => <blockquote className="mt-4 border-l-2 pl-6 italic text-base" {...p} />,
  ul: (p) => (
    <ul
      className="my-6 ml-6 list-disc [&>li]:mt-2 break-words whitespace-normal min-w-0"
      {...p}
    />
  ),
  ol: (p) => (
    <ol
      className="my-6 ml-6 list-decimal [&>li]:mt-2 break-words whitespace-normal min-w-0"
      {...p}
    />
  ),
  li: (p) => <li className="break-words min-w-0" {...p} />,
  a: CustomLink,
  img: (p) => (
    <img
      {...p}
      className={cn("max-w-full h-auto rounded-lg my-4", p.className)}
      style={{ ...(p.style || {}), height: "auto", maxWidth: "100%" }}
      alt={p.alt || ""}
    />
  ),
  table: CustomTable,
  tr: (p) => <tr className="m-0 border-t p-0 even:bg-muted" {...p} />,
  th: (p) => (
    <th
      className="border-b px-4 py-2 text-left font-bold [&[align=center]]:text-center [&[align=right]]:text-right whitespace-nowrap"
      {...p}
    />
  ),
  td: (p) => (
    <td
      className="px-4 py-2 text-left [&[align=center]]:text-center [&[align=right]]:text-right align-top break-words"
      {...p}
    />
  ),
  hr: (p) => <hr className="my-6 border-muted-foreground/20" {...p} />,
  b: (p) => <b className="font-semibold" {...p} />,
  strong: (p) => <strong className="font-semibold" {...p} />,
  em: (p) => <em className="italic" {...p} />,
  del: (p) => <del className="line-through" {...p} />,
  pre: Pre,
} satisfies Components

const HAS_MERMAID = /```(?:mermaid)[\s\S]*?```/i

/** -------------------------------------------------------
 * Renderer: math override + mermaid
 * ------------------------------------------------------*/
const Renderer = ({ content }: { content: string }) => {
  const rootRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (!HAS_MERMAID.test(content)) return

    let cancelled = false
    ;(async () => {
      const [{ default: mermaid }] = await Promise.all([
        import("mermaid"),
        import("cytoscape"),
      ])

      if (cancelled) return

      mermaid.initialize({ startOnLoad: false })

      const container = rootRef.current
      if (!container) return

      const codeBlocks = container.querySelectorAll("pre > code.language-mermaid")
      let idx = 0

      for (const code of codeBlocks) {
        const parentPre =
          code.parentElement?.tagName === "PRE"
            ? (code.parentElement as HTMLElement)
            : (code as HTMLElement)

        const src = code.textContent || ""
        const id = `m_${Date.now()}_${idx++}`

        try {
          const { svg } = await mermaid.render(id, src)
          const wrapper = document.createElement("div")
          wrapper.className = "my-4"
          wrapper.innerHTML = svg
          parentPre.replaceWith(wrapper)
        } catch {
          // empty
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [content])

  return (
    <div ref={rootRef}>
      <Streamdown
        components={components}
        shikiTheme={["rose-pine-dawn", "rose-pine-moon"]}
        remarkPlugins={[ [remarkMath, { singleDollarTextMath: true }] ]}
        rehypePlugins={[ rehypeKatex ]}
      >
        {content}
      </Streamdown>
    </div>
  )
}

/** -------------------------------------------------------
 * MarkdownView wrapper
 * ------------------------------------------------------*/
export interface MarkdownViewProps {
  content: string
  isStreaming?: boolean
}

export const MarkdownView = React.memo(
  ({ content }: MarkdownViewProps) => {
    React.useEffect(() => {
      ensureScrollbarStyleInjected()
    }, [])

    return (
      <div className="w-full min-w-0">
        <Renderer content={content} />
      </div>
    )
  },
  (prev, next) =>
    prev.content === next.content && prev.isStreaming === next.isStreaming
)