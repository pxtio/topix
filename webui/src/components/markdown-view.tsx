import ReactMarkdown from "react-markdown"
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import rehypeHighlight from 'rehype-highlight'
import remarkGfm from 'remark-gfm'
import 'katex/dist/katex.min.css'
import 'highlight.js/styles/github.css'
import { Copy } from "lucide-react"
import { toast } from "sonner"
import React from "react"
import { cn } from "@/lib/utils"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "./ui/hover-card"
import { LinkPreviewCard } from "@/features/agent/components/link-preview"


/**
 * Custom code view component that handles both inline and block code.
 */
interface CustomCodeViewProps {
  className?: string
  children?: React.ReactNode
}


/**
 * Extracts text from React nodes, handling strings, arrays, and valid React elements.
 */
const extractText = (children: React.ReactNode): string => {
  if (typeof children === 'string') {
    return children
  }

  if (Array.isArray(children)) {
    return children.map(extractText).join('')
  }

  if (React.isValidElement(children)) {
    const element = children as React.ReactElement<{ children?: React.ReactNode }>
    return extractText(element.props.children)
  }

  return ''
}

/**
 * Custom code view component that handles both inline and block code.
 * It also provides a copy-to-clipboard functionality.
 *
 * @param {CustomCodeViewProps} props - The properties for the custom code view.
 * @returns {JSX.Element} The rendered code view component.
 */
const CustomCodeView: React.FC<CustomCodeViewProps> = ({ className, children }) => {
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      console.log('Text copied to clipboard: ', text)
      toast('Text copied to clipboard!')
    }).catch(err => {
      console.error('Failed to copy text: ', err)
    })
  }

  const codeContent = extractText(children)
  const isBlock = codeContent.includes('\n') // Check for multiline content
  const match = /language-(\w+)/.exec(className || '')
  const language = match ? match[1] : 'plaintext'

  return isBlock ? (
    <pre
      className={cn('text-sm text-mono !rounded-2xl p-4 bg-muted relative my-4 border-none overflow-x-auto', className)}
    >
      <button
        onClick={() => handleCopy(codeContent)}
        className="transition-all absolute top-1 right-1 text-sm bg-transparent hover:bg-accent p-2 rounded-xl text-accent-foreground"
        aria-label="Copy to clipboard"
      >
        <Copy strokeWidth={1.75} className='h-4 w-4' />
      </button>
      <span className="absolute top-0 left-0 w-auto px-4 py-2 text-xs font-mono">
        {language}
      </span>
      <code className={"block mt-6"}>{children}</code>
    </pre>
  ) : (
    <code
      className={cn('text-left text-sm text-mono text-red-700 bg-muted text-muted-foreground rounded-lg', className)}
    >
      {children}
    </code>
  )
}


interface CustomLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  isStreaming?: boolean
  children?: React.ReactNode
}

const CustomLink: React.FC<CustomLinkProps> = ({ isStreaming = false, children, ...props }) => {
  // Ensure children is an array and get the first element as a string
  const content = Array.isArray(children) ? children[0] : children
  const contentWithoutBrackets = typeof content === 'string' ? content.replace(/^\[|\]$/g, '') : "KB"

  const aClass = "transition-all inline-block px-2 py-1 text-muted-foreground text-xs font-mono font-medium border border-border hover:bg-accent rounded-lg"

  if (isStreaming) {
    return (
      <a
        href={props.href}
        className={aClass}
        target="_blank"
      >
        {contentWithoutBrackets}
      </a>
    )
  }

  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <a
          href={props.href}
          className={aClass}
          target="_blank"
        >
          {contentWithoutBrackets}
        </a>
      </HoverCardTrigger>
      <HoverCardContent>
        <LinkPreviewCard url={props.href || ''} />
      </HoverCardContent>
    </HoverCard>
  )
}


/**
 * MarkdownViewProps defines the properties for the MarkdownView component.
 *
 * @property content - The markdown content to be rendered.
 */
export interface MarkdownViewProps {
  isStreaming?: boolean
  content: string
}


/**
 * MarkdownView is a React component that renders markdown content.
 */
export const MarkdownView =({ isStreaming = false, content }: MarkdownViewProps) => {
  return (
    <>
      <ReactMarkdown
        remarkPlugins={[remarkMath, remarkGfm]}
        rehypePlugins={[rehypeKatex, rehypeHighlight]}
        components={{
          h1: ({ ...props }) => <h1 className="mt-10 scroll-m-20 border-b pb-2 text-3xl font-heading font-semibold tracking-tight transition-colors first:mt-0" {...props} />,
          h2: ({ ...props }) => <h2
            className="mt-8 scroll-m-20 text-2xl font-heading font-semibold tracking-tight"
            {...props}
          />,
          h3: ({ ...props }) => <h3 className="mt-6 scroll-m-20 text-xl font-heading font-semibold tracking-tight" {...props} />,
          h4: ({ ...props }) => <h4 className="mt-6 scroll-m-20 text-lg font-heading font-semibold tracking-tight" {...props} />,
          p: ({ ...props }) => <p className="leading-7 [&:not(:first-child)]:mt-6 text-base" {...props} />,
          blockquote: ({ ...props }) => <blockquote className="mt-4 border-l-2 pl-6 italic text-sm" {...props} />,
          ul: ({ ...props }) => <ul className="my-6 ml-6 list-disc [&>li]:mt-2" {...props} />,
          ol: ({ ...props }) => <ul className="my-6 ml-6 list-decimal [&>li]:mt-2" {...props} />,
          li: ({ ...props }) => <li className="" {...props} />,
          a: ({ ...props }) => <CustomLink {...props} isStreaming={isStreaming} />,
          // Custom rendering for code blocks
          code: CustomCodeView,
          table: ({ ...props }) => <div className='my-8 w-full overflow-y-auto'><table className="w-full text-base border-b" {...props} /></div>,
          tr: ({ ...props }) => <tr className="m-0 border-t p-0 even:bg-muted" {...props} />,
          th: ({ ...props }) => <th className="border-b px-4 py-2 text-left font-bold [&[align=center]]:text-center [&[align=right]]:text-right" {...props} />,
          td: ({ ...props }) => <td className="px-4 py-2 text-left [&[align=center]]:text-center [&[align=right]]:text-right" {...props} />,
          b: ({ ...props }) => <b className="font-semibold" {...props} />,
          strong: ({ ...props }) => <strong className="font-semibold" {...props} />,
          em: ({ ...props }) => <em className="italic" {...props} />,
          del: ({ ...props }) => <del className="line-through" {...props} />,
        }}
      >{ content }</ReactMarkdown>
    </>
  )
}