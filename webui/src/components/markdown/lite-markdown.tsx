import { Fragment, memo, useMemo } from 'react'
import clsx from 'clsx'
import katex from 'katex'
import 'katex/dist/katex.min.css'

type Token =
  | { type: 'text'; content: string }
  | { type: 'bold'; content: string }
  | { type: 'italic'; content: string }
  | { type: 'underline'; content: string }
  | { type: 'strike'; content: string }
  | { type: 'code'; content: string }
  | { type: 'code-block'; content: string; language?: string }
  | { type: 'link'; content: string; href: string }
  | { type: 'math-inline'; content: string }
  | { type: 'math-block'; content: string }

const INLINE_PATTERN =
  /(\$\$[\s\S]+?\$\$|\$[^$]+\$|\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*|__[^_]+__|~~[^~]+~~|_[^_]+_|\[[^\]]+\]\([^)]+\))/g

const transformArrows = (value: string) =>
  value.replace(/<-|->/g, (match) => (match === '->' ? '→' : '←'))

function tokenizeInline(segment: string): Token[] {
  if (!segment) return []
  const tokens: Token[] = []
  let lastIndex = 0

  segment.replace(INLINE_PATTERN, (match, _group, offset) => {
    const idx = offset as number
    if (idx > lastIndex) {
      tokens.push({ type: 'text', content: transformArrows(segment.slice(lastIndex, idx)) })
    }

    if (match.startsWith('$$') && match.endsWith('$$')) {
      tokens.push({ type: 'math-block', content: match.slice(2, -2).trim() })
    } else if (match.startsWith('$') && match.endsWith('$')) {
      tokens.push({ type: 'math-inline', content: match.slice(1, -1).trim() })
    } else if ((match.startsWith('**') && match.endsWith('**')) || (match.startsWith('__') && match.endsWith('__'))) {
      tokens.push({ type: 'bold', content: transformArrows(match.slice(2, -2)) })
    } else if ((match.startsWith('*') && match.endsWith('*'))) {
      tokens.push({ type: 'italic', content: transformArrows(match.slice(1, -1)) })
    } else if (match.startsWith('~~') && match.endsWith('~~')) {
      tokens.push({ type: 'strike', content: transformArrows(match.slice(2, -2)) })
    } else if (match.startsWith('_') && match.endsWith('_')) {
      tokens.push({ type: 'underline', content: transformArrows(match.slice(1, -1)) })
    } else if (match.startsWith('[') && match.includes('](') && match.endsWith(')')) {
      const splitIndex = match.indexOf('](')
      const text = match.slice(1, splitIndex)
      const href = match.slice(splitIndex + 2, -1)
      tokens.push({ type: 'link', content: transformArrows(text), href })
    } else if (match.startsWith('`') && match.endsWith('`')) {
      tokens.push({ type: 'code', content: match.slice(1, -1) })
    } else {
      tokens.push({ type: 'text', content: transformArrows(match) })
    }

    lastIndex = idx + match.length
    return match
  })

  if (lastIndex < segment.length) {
    tokens.push({ type: 'text', content: transformArrows(segment.slice(lastIndex)) })
  }

  return tokens
}

function tokenize(input: string): Token[] {
  if (!input) return []
  const tokens: Token[] = []
  let cursor = 0

  while (cursor < input.length) {
    const fenceStart = input.indexOf('```', cursor)
    if (fenceStart === -1) {
      tokens.push(...tokenizeInline(input.slice(cursor)))
      break
    }

    if (fenceStart > cursor) {
      tokens.push(...tokenizeInline(input.slice(cursor, fenceStart)))
    }

    const fenceEnd = input.indexOf('```', fenceStart + 3)
    if (fenceEnd === -1) {
      tokens.push(...tokenizeInline(input.slice(fenceStart)))
      break
    }

    const fenceContent = input.slice(fenceStart + 3, fenceEnd)
    const delimiterIndex = fenceContent.search(/[\r\n]/)
    let language = ''
    let codeContent = fenceContent

    if (delimiterIndex >= 0) {
      language = fenceContent.slice(0, delimiterIndex).trim()
      codeContent = fenceContent.slice(delimiterIndex).replace(/^\r?\n/, '')
    }

    tokens.push({
      type: 'code-block',
      content: codeContent,
      language: language || undefined
    })

    cursor = fenceEnd + 3
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

export const LiteMarkdown = memo(function LiteMarkdown({ text, className }: LiteMarkdownProps) {
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
            <code key={index} className='px-1 rounded bg-muted font-mono'>
              {token.content}
            </code>
          )
        }

        if (token.type === 'code-block') {
          return (
            <pre key={index} className='my-2 rounded bg-transparent px-3 py-2 overflow-x-auto'>
              <code className='font-mono text-sm whitespace-pre-wrap'>
                {token.content}
              </code>
            </pre>
          )
        }

        if (token.type === 'link') {
          return (
            <a
              key={index}
              href={token.href}
              target='_blank'
              rel='noreferrer'
              className='text-secondary underline hover:text-secondary/80'
            >
              {token.content}
            </a>
          )
        }

        if (token.type === 'underline') {
          return (
            <span key={index} className='underline'>
              {token.content}
            </span>
          )
        }

        if (token.type === 'strike') {
          return (
            <span key={index} className='line-through'>
              {token.content}
            </span>
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
})
