import React from "react"
import type { Components } from "react-markdown"
import "katex/dist/katex.min.css"
import { cn } from "@/lib/utils"
import { CustomTable } from "./custom-table"
import { Pre } from "./custom-pre"
import { Streamdown } from "streamdown"

import remarkGfm from "remark-gfm"
import remarkMath from "remark-math"
import rehypeKatex from "rehype-katex"

/** -------------------------------------------------------
 *  transparent scrollbars
 *  ------------------------------------------------------*/
let __mkScrollbarInjected = false
function ensureScrollbarStyleInjected() {
  if (__mkScrollbarInjected) return
  if (typeof document === "undefined") return

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
 *  CustomLink — typed + small
 *  ------------------------------------------------------*/
type CustomLinkProps = React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  children?: React.ReactNode
}

function CustomLink({ children, href, ...rest }: CustomLinkProps) {
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

/** -------------------------------------------------------
 *  Typed wrappers for common elements
 *  ------------------------------------------------------*/
function H1(props: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h1 className="mt-7 scroll-m-20 pb-2 text-2xl font-heading font-medium tracking-tight first:mt-0" {...props} />
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
  table: CustomTable,
  tr: Tr,
  th: Th,
  td: Td,
  hr: Hr,
  b: (props: React.HTMLAttributes<HTMLElement>) => <b className="font-semibold" {...props} />,
  strong: (props: React.HTMLAttributes<HTMLElement>) => <strong className="font-semibold" {...props} />,
  em: (props: React.HTMLAttributes<HTMLElement>) => <em className="italic" {...props} />,
  del: (props: React.HTMLAttributes<HTMLElement>) => <del className="line-through" {...props} />,
  pre: Pre,
} satisfies Components

/** -------------------------------------------------------
 * Renderer: GFM + math override + mermaid
 * ------------------------------------------------------*/
const Renderer: React.FC<{ content: string }> = ({ content }) => {
  return (
    <div>
      <Streamdown
        components={components}
        shikiTheme={["rose-pine-dawn", "rose-pine-moon"]}
        remarkPlugins={[
          remarkGfm, // <- restores GFM (tables, task lists, etc.)
          [remarkMath, { singleDollarTextMath: true }], // <- $...$ + $$...$$
        ]}
        rehypePlugins={[
          rehypeKatex, // <- render math with KaTeX
        ]}
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

export const MarkdownView: React.FC<MarkdownViewProps> = React.memo(
  ({ content }) => {
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
