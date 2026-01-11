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
  | { type: 'progress'; completed: number; total: number }

const INLINE_PATTERN =
  /(\$\$[\s\S]+?\$\$|\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*|__[^_]+__|~~[^~]+~~|_[^_]+_|\[[^\]]+\]\([^)]+\))/g
const CHECK_LINE_PATTERN = /^[ \t]*(\[(v)\]|☑|✅)/i
const EMPTY_LINE_PATTERN = /^[ \t]*(\[\]|☐)/i
const CROSS_LINE_PATTERN = /^([ \t]*)(\[(x)\]|☒|❎)(\s*)(.*)$/i

const transformSymbols = (value: string) =>
  value.replace(/<=>|<->|<-|->|\[\]|\[[vx]\]/gi, (match) => {
    const normalized = match.toLowerCase()

    if (normalized === '->') return '→'
    if (normalized === '<-') return '←'
    if (normalized === '<->') return '↔'
    if (normalized === '<=>') return '⇔'
    if (normalized === '[]') return '☐'
    if (normalized === '[v]') return '✅'
    if (normalized === '[x]') return '❎'

    return match
  })

function tokenizeInline(segment: string): Token[] {
  if (!segment) return []
  const tokens: Token[] = []
  let lastIndex = 0

  segment.replace(INLINE_PATTERN, (match, _group, offset) => {
    const idx = offset as number
    if (idx > lastIndex) {
      tokens.push({ type: 'text', content: transformSymbols(segment.slice(lastIndex, idx)) })
    }

    if (match.startsWith('$$') && match.endsWith('$$')) {
      const body = match.slice(2, -2)
      const trimmed = body.trim()
      const isBlock = body.includes('\n')
      tokens.push({ type: isBlock ? 'math-block' : 'math-inline', content: trimmed })
    } else if ((match.startsWith('**') && match.endsWith('**')) || (match.startsWith('__') && match.endsWith('__'))) {
      tokens.push({ type: 'bold', content: transformSymbols(match.slice(2, -2)) })
    } else if ((match.startsWith('*') && match.endsWith('*'))) {
      tokens.push({ type: 'italic', content: transformSymbols(match.slice(1, -1)) })
    } else if (match.startsWith('~~') && match.endsWith('~~')) {
      tokens.push({ type: 'strike', content: transformSymbols(match.slice(2, -2)) })
    } else if (match.startsWith('_') && match.endsWith('_')) {
      tokens.push({ type: 'underline', content: transformSymbols(match.slice(1, -1)) })
    } else if (match.startsWith('[') && match.includes('](') && match.endsWith(')')) {
      const splitIndex = match.indexOf('](')
      const text = match.slice(1, splitIndex)
      const href = match.slice(splitIndex + 2, -1)
      tokens.push({ type: 'link', content: transformSymbols(text), href })
    } else if (match.startsWith('`') && match.endsWith('`')) {
      tokens.push({ type: 'code', content: match.slice(1, -1) })
    } else {
      tokens.push({ type: 'text', content: transformSymbols(match) })
    }

    lastIndex = idx + match.length
    return match
  })

  if (lastIndex < segment.length) {
    tokens.push({ type: 'text', content: transformSymbols(segment.slice(lastIndex)) })
  }

  return tokens
}

function tokenizeLine(line: string): Token[] {
  const match = line.match(CROSS_LINE_PATTERN)
  if (!match) {
    return tokenizeInline(line)
  }

  const prefix = `${match[1]}${match[2]}${match[4] ?? ''}`
  const rest = match[5] ?? ''
  const tokens: Token[] = [{ type: 'text', content: transformSymbols(prefix) }]

  if (rest.length > 0) {
    tokens.push({ type: 'strike', content: transformSymbols(rest) })
  }

  return tokens
}

function tokenizeTextBlock(block: string): Token[] {
  if (!block) return []
  const lines = block.split('\n')
  const tokens: Token[] = []

  lines.forEach((line, index) => {
    tokens.push(...tokenizeLine(line))
    if (index < lines.length - 1) {
      tokens.push({ type: 'text', content: '\n' })
    }
  })

  return tokens
}

type TaskCounts = {
  completed: number
  total: number
}

function countTasksInTextBlock(block: string, counts: TaskCounts) {
  if (!block) return
  const lines = block.split('\n')

  lines.forEach(line => {
    if (CHECK_LINE_PATTERN.test(line)) {
      counts.completed += 1
      counts.total += 1
      return
    }

    if (CROSS_LINE_PATTERN.test(line)) {
      counts.completed += 1
      counts.total += 1
      return
    }

    if (EMPTY_LINE_PATTERN.test(line)) {
      counts.total += 1
    }
  })
}

function countTasks(input: string): TaskCounts {
  const counts = { completed: 0, total: 0 }
  if (!input) return counts
  let cursor = 0

  while (cursor < input.length) {
    const fenceStart = input.indexOf('```', cursor)
    if (fenceStart === -1) {
      countTasksInTextBlock(input.slice(cursor), counts)
      break
    }

    if (fenceStart > cursor) {
      countTasksInTextBlock(input.slice(cursor, fenceStart), counts)
    }

    const fenceEnd = input.indexOf('```', fenceStart + 3)
    if (fenceEnd === -1) {
      break
    }

    cursor = fenceEnd + 3
  }

  return counts
}

function tokenize(input: string): Token[] {
  if (!input) return []
  const tokens: Token[] = []
  let cursor = 0

  while (cursor < input.length) {
    const fenceStart = input.indexOf('```', cursor)
    if (fenceStart === -1) {
      tokens.push(...tokenizeTextBlock(input.slice(cursor)))
      break
    }

    if (fenceStart > cursor) {
      tokens.push(...tokenizeTextBlock(input.slice(cursor, fenceStart)))
    }

    const fenceEnd = input.indexOf('```', fenceStart + 3)
    if (fenceEnd === -1) {
      tokens.push(...tokenizeTextBlock(input.slice(fenceStart)))
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
  const tokens = useMemo<Token[]>(() => {
    const baseTokens = tokenize(text)
    const counts = countTasks(text)

    if (counts.total === 0) {
      return baseTokens
    }

    const progressToken: Token = {
      type: 'progress',
      completed: counts.completed,
      total: counts.total
    }

    return [
      progressToken,
      { type: 'text', content: '\n' },
      ...baseTokens
    ]
  }, [text])

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
              dangerouslySetInnerHTML={renderMath(token.content || '', false)}
            />
          )
        }

        if (token.type === 'math-block') {
          return (
            <div
              key={index}
              className='my-1 flex justify-center'
              dangerouslySetInnerHTML={renderMath(token.content || '', true)}
            />
          )
        }

        if (token.type === 'progress') {
          const total = token.total || 0
          const completed = token.completed || 0
          const percent = total > 0 ? Math.min(100, Math.max(0, Math.round((completed / total) * 100))) : 0

          return (
            <span key={index} className='inline-flex items-center gap-1 align-middle mb-2'>
              <svg
                aria-hidden='true'
                viewBox='0 0 36 36'
                className='h-5 w-5 shrink-0 text-foreground'
              >
                <circle
                  cx='18'
                  cy='18'
                  r='15.5'
                  fill='none'
                  strokeWidth='4'
                  className='stroke-muted'
                />
                <circle
                  cx='18'
                  cy='18'
                  r='15.5'
                  fill='none'
                  strokeWidth='4'
                  strokeDasharray={`${percent} 100`}
                  strokeLinecap='round'
                  transform='rotate(-90 18 18)'
                  className='stroke-secondary'
                />
              </svg>
              <span className='text-sm font-semibold font-mono text-muted-foreground'>
                [{completed}/{total}]
              </span>
            </span>
          )
        }

        return <Fragment key={index}>{token.content}</Fragment>
      })}
    </span>
  )
})
