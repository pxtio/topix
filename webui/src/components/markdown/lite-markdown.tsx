import { Fragment, useMemo } from 'react'
import clsx from 'clsx'
import katex from 'katex'
import 'katex/dist/katex.min.css'

type Token =
  | { type: 'text'; content: string }
  | { type: 'bold'; content: string }
  | { type: 'italic'; content: string }
  | { type: 'code'; content: string }
  | { type: 'math-inline'; content: string }
  | { type: 'math-block'; content: string }

const INLINE_PATTERN =
  /(\$\$[\s\S]+?\$\$|\$[^$]+\$|\*\*[^*]+\*\*|__[^_]+__|`[^`]+`|\*[^*]+\*|_[^_]+_)/g

function tokenize(input: string): Token[] {
  if (!input) return []
  const tokens: Token[] = []
  let lastIndex = 0

  input.replace(INLINE_PATTERN, (match, _group, offset) => {
    const idx = offset as number
    if (idx > lastIndex) {
      tokens.push({ type: 'text', content: input.slice(lastIndex, idx) })
    }

    if (match.startsWith('$$') && match.endsWith('$$')) {
      tokens.push({ type: 'math-block', content: match.slice(2, -2).trim() })
    } else if (match.startsWith('$') && match.endsWith('$')) {
      tokens.push({ type: 'math-inline', content: match.slice(1, -1).trim() })
    } else if ((match.startsWith('**') && match.endsWith('**')) || (match.startsWith('__') && match.endsWith('__'))) {
      tokens.push({ type: 'bold', content: match.slice(2, -2) })
    } else if ((match.startsWith('*') && match.endsWith('*')) || (match.startsWith('_') && match.endsWith('_'))) {
      tokens.push({ type: 'italic', content: match.slice(1, -1) })
    } else if (match.startsWith('`') && match.endsWith('`')) {
      tokens.push({ type: 'code', content: match.slice(1, -1) })
    } else {
      tokens.push({ type: 'text', content: match })
    }

    lastIndex = idx + match.length
    return match
  })

  if (lastIndex < input.length) {
    tokens.push({ type: 'text', content: input.slice(lastIndex) })
  }

  return tokens
}

export type LiteMarkdownProps = {
  text: string
  className?: string
}

function renderMath(content: string, displayMode: boolean): { __html: string } {
  try {
    return {
      __html: katex.renderToString(content, {
        throwOnError: false,
        displayMode
      })
    }
  } catch {
    return { __html: content }
  }
}

export function LiteMarkdown({ text, className }: LiteMarkdownProps) {
  const tokens = useMemo(() => tokenize(text), [text])

  return (
    <span className={clsx('whitespace-pre-wrap break-words', className)}>
      {tokens.map((token, index) => {
        if (token.type === 'bold') {
          return (
            <strong key={index} className='font-semibold'>
              {token.content}
            </strong>
          )
        }

        if (token.type === 'italic') {
          return (
            <em key={index} className='italic'>
              {token.content}
            </em>
          )
        }

        if (token.type === 'code') {
          return (
            <code key={index} className='px-1 rounded bg-muted text-xs font-mono'>
              {token.content}
            </code>
          )
        }

        if (token.type === 'math-inline') {
          return (
            <span
              key={index}
              className='inline-block align-middle'
              dangerouslySetInnerHTML={renderMath(token.content, false)}
            />
          )
        }

        if (token.type === 'math-block') {
          return (
            <div
              key={index}
              className='my-1 flex justify-center'
              dangerouslySetInnerHTML={renderMath(token.content, true)}
            />
          )
        }

        return <Fragment key={index}>{token.content}</Fragment>
      })}
    </span>
  )
}
