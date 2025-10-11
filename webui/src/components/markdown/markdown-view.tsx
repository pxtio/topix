import React from "react"
import type { Components } from "react-markdown"
import "katex/dist/katex.min.css"
import { cn } from "@/lib/utils"
import { CustomTable } from "./custom-table"
import { Pre } from "./custom-pre"
import type { Schema } from "hast-util-sanitize"

/** -------------------------------------------------------
 *  one-time transparent scrollbar styles (for tables)
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
 *  CustomLink — stable and lightweight (typed)
 *  ------------------------------------------------------*/
type CustomLinkProps = React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  children?: React.ReactNode
}

function CustomLink({ children, href, ...rest }: CustomLinkProps) {
  const content = Array.isArray(children) ? children[0] : children
  const label = typeof content === "string" ? content.replace(/^[[]|[\]]$/g, "") : "KB"

  const aClass =
    "transition-all inline-block px-2 py-1 text-muted-foreground text-xs font-mono font-medium border border-border bg-card hover:bg-accent rounded-lg"

  return (
    <a href={href} className={aClass} target="_blank" rel="noreferrer" {...rest}>
      {label}
    </a>
  )
}

/** -------------------------------------------------------
 *  Typed wrappers for common elements
 *  ------------------------------------------------------*/
function H1(props: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h1 className="mt-7 scroll-m-20 border-b border-muted-foreground/20 pb-2 text-2xl font-heading font-medium tracking-tight first:mt-0" {...props} />
}

function H2(props: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className="mt-6 scroll-m-20 text-xl font-heading font-medium tracking-tight" {...props} />
}

function H3(props: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className="mt-5 scroll-m-20 text-lg font-heading font-medium tracking-tight" {...props} />
}

function H4(props: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h4 className="mt-4 scroll-m-20 text-base font-heading font-medium tracking-tight" {...props} />
}

function P(props: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className="
        leading-7 text-base [&:not(:first-child)]:mt-4
        break-words whitespace-normal
        min-w-0
      "
      {...props}
    />
  )
}

function Blockquote(props: React.BlockquoteHTMLAttributes<HTMLElement>) {
  return <blockquote className="mt-4 border-l-2 pl-6 italic text-base" {...props} />
}

function Ul(props: React.HTMLAttributes<HTMLUListElement>) {
  return (
    <ul
      className="
        my-6 ml-6 list-disc [&>li]:mt-2
        break-words whitespace-normal
        min-w-0
      "
      {...props}
    />
  )
}

function Ol(props: React.HTMLAttributes<HTMLOListElement>) {
  return (
    <ol
      className="
        my-6 ml-6 list-decimal [&>li]:mt-2
        break-words whitespace-normal
        min-w-0
      "
      {...props}
    />
  )
}

function Li(props: React.LiHTMLAttributes<HTMLLIElement>) {
  return <li className="break-words min-w-0" {...props} />
}

function Img(props: React.ImgHTMLAttributes<HTMLImageElement>) {
  return (
    <img
      {...props}
      className={cn("max-w-full h-auto rounded-lg my-4", props.className)}
      style={{ ...(props.style || {}), height: "auto", maxWidth: "100%" }}
      alt={props.alt || ""}
    />
  )
}

function Tr(props: React.HTMLAttributes<HTMLTableRowElement>) {
  return <tr className="m-0 border-t p-0 even:bg-muted" {...props} />
}

function Th(props: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className="
        border-b px-4 py-2 text-left font-bold
        [&[align=center]]:text-center [&[align=right]]:text-right
        whitespace-nowrap
      "
      {...props}
    />
  )
}

function Td(props: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      className="
        px-4 py-2 text-left
        [&[align=center]]:text-center [&[align=right]]:text-right
        align-top
        break-words
      "
      {...props}
    />
  )
}

function Hr(props: React.HTMLAttributes<HTMLHRElement>) {
  return <hr className="my-6 border-muted-foreground/20" {...props} />
}

/** components map — fully typed and safe */
const components = {
  h1: H1,
  h2: H2,
  h3: H3,
  h4: H4,
  p: P,
  blockquote: Blockquote,
  ul: Ul,
  ol: Ol,
  li: Li,
  a: CustomLink,
  img: Img,
  table: CustomTable, // ensure CustomTable is typed as React.FC<React.TableHTMLAttributes<HTMLTableElement>>
  tr: Tr,
  th: Th,
  td: Td,
  hr: Hr,
  b: (props: React.HTMLAttributes<HTMLElement>) => <b className="font-semibold" {...props} />,
  strong: (props: React.HTMLAttributes<HTMLElement>) => <strong className="font-semibold" {...props} />,
  em: (props: React.HTMLAttributes<HTMLElement>) => <em className="italic" {...props} />,
  del: (props: React.HTMLAttributes<HTMLElement>) => <del className="line-through" {...props} />,
  pre: Pre
} satisfies Components


const HAS_MERMAID = /```(?:mermaid)[\s\S]*?```/i

/* -------------------------------------------
   Lazy renderer: loads Streamdown + plugins,
   and conditionally loads mermaid + cytoscape
------------------------------------------- */
const LazyRenderer = React.lazy(async () => {
  const [
    streamdownMod,
    remarkGfmMod,
    rehypeRawMod,
    rehypeSanitizeMod,
  ] = await Promise.all([
    import("streamdown"),
    import("remark-gfm"),
    import("rehype-raw"),
    import("rehype-sanitize"),
    import("katex/dist/katex.min.css"),
  ])

  const { Streamdown } = streamdownMod
  const remarkGfm = remarkGfmMod.default
  const rehypeRaw = rehypeRawMod.default
  const rehypeSanitize = rehypeSanitizeMod.default
  const defaultSchema = rehypeSanitizeMod.defaultSchema as Schema

  const brOnlySchema: Schema = {
    ...defaultSchema,
    tagNames: [...(defaultSchema.tagNames ?? []), "br"],
  }

  const Renderer: React.FC<{ content: string }> = ({ content }) => {
    const rootRef = React.useRef<HTMLDivElement>(null)

    // Only when mermaid code fences exist, pull mermaid + cytoscape
    React.useEffect(() => {
      if (!HAS_MERMAID.test(content)) return
      let cancelled = false

      ;(async () => {
        // Load mermaid + (heavy) cytoscape on demand
        const [{ default: mermaid }] = await Promise.all([
          import("mermaid"),
          import("cytoscape"), // side-effect: used by mermaid for certain layouts/plugins
        ])

        if (cancelled) return

        mermaid.initialize({ startOnLoad: false })
        const container = rootRef.current
        if (!container) return

        // Find ```mermaid blocks rendered by Streamdown -> <pre><code class="language-mermaid">...</code></pre>
        const codeBlocks = container.querySelectorAll<HTMLPreElement>("pre > code.language-mermaid")
        let idx = 0
        for (const code of codeBlocks) {
          const parentPre = code.parentElement?.tagName === "PRE" ? code.parentElement as HTMLElement : code as HTMLElement
          const source = code.textContent || ""
          const id = `m_${Date.now()}_${idx++}`

          try {
            const { svg } = await mermaid.render(id, source)
            const wrapper = document.createElement("div")
            wrapper.className = "my-4"
            wrapper.innerHTML = svg
            parentPre.replaceWith(wrapper)
          } catch {
            // If render fails, keep the original code block
            // (optionally log or show a small error badge)
            // console.error(e)
          }
        }
      })()

      return () => { cancelled = true }
    }, [content])

    return (
      <div ref={rootRef}>
        <Streamdown
          shikiTheme={["rose-pine-dawn", "rose-pine-moon"]}
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeRaw, [rehypeSanitize, brOnlySchema]]}
          components={components}
        >
          {content}
        </Streamdown>
      </div>
    )
  }

  return { default: Renderer }
})


/** -------------------------------------------------------
 *  Props
 *  ------------------------------------------------------*/
export interface MarkdownViewProps {
  content: string
  isStreaming?: boolean
}


/** -------------------------------------------
 * MarkdownView
 * ------------------------------------------*/
export const MarkdownView: React.FC<MarkdownViewProps> = React.memo(
  ({ content }) => {
    React.useEffect(() => { ensureScrollbarStyleInjected() }, [])

    return (
      <div className="w-full min-w-0">
        <React.Suspense fallback={<div>{content}</div>}>
          <LazyRenderer content={content} />
        </React.Suspense>
      </div>
    )
  },
  (prev, next) => prev.content === next.content && prev.isStreaming === next.isStreaming
)