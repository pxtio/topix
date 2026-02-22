import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'

import type { NoteNode } from '../../types/flow'
import { useGraphStore } from '../../store/graph-store'
import { useTheme } from '@/components/theme-provider'
import { darkModeDisplayHex, darkerDisplayHex, lighterDisplayHex } from '../../lib/colors/dark-variants'
import { fontFamilyToTwClass, fontSizeToTwClass, textStyleToTwClass } from '../../types/style'
import { isTransparent } from '../../lib/colors/tailwind'


type Props = {
  node: NoteNode
}


const normalizeLabel = (markdown?: string) => {
  const text = (markdown ?? '').replace(/\s+/g, ' ').trim()
  return text || 'Untitled folder'
}


type FolderIconProps = {
  backFill: string
  frontFill: string
  strokeColor: string
}


const FolderIcon = ({ backFill, frontFill, strokeColor }: FolderIconProps) => (
  <svg
    viewBox='0 0 176.34001148055313 139.78787752716778'
    className='w-full h-full'
    aria-hidden='true'
  >
    <rect x='0' y='0' width='176.34001148055313' height='139.78787752716778' fill='transparent' />
    <g strokeLinecap='round'>
      <g transform='translate(10.909074119042202 10.141056228623995) rotate(0 77.26093162123442 59.75288253495998)' fillRule='evenodd'>
        <path d='M-0.76 0.91 L60.29 -1.3 L85.75 21.46 L155.52 21.28 L152.85 119.91 L0.73 118.99 L-1.63 0.6' stroke='none' strokeWidth='0' fill={backFill} fillRule='evenodd' />
        <path d='M0 0 C17.53 -0.66, 33.72 1.27, 62.03 0 M0 0 C22.67 1.01, 44.88 1.39, 62.03 0 M62.03 0 C70 8.26, 78.24 17.45, 84.35 21.12 M62.03 0 C69.8 7.43, 76.96 14.93, 84.35 21.12 M84.35 21.12 C104.23 20.29, 123.92 20.16, 154.18 21.12 M84.35 21.12 C100.53 21.64, 115.05 21.4, 154.18 21.12 M154.18 21.12 C156.03 43.66, 155.66 66.44, 154.18 117.99 M154.18 21.12 C154.42 46.34, 153.85 70.99, 154.18 117.99 M154.18 117.99 C105.71 120.39, 57.4 120, 0 117.99 M154.18 117.99 C99.57 118.72, 44.44 118.88, 0 117.99 M0 117.99 C-2.07 73.13, 0.06 25.53, 0 0 M0 117.99 C-1.11 88.05, -0.32 58.66, 0 0 M0 0 C0 0, 0 0, 0 0 M0 0 C0 0, 0 0, 0 0' stroke={strokeColor} strokeWidth='4' fill='none' />
      </g>
    </g>
    <g strokeLinecap='round'>
      <g transform='translate(165.44143002981946 31.259407577093214) rotate(0 -77.63307152033497 48.34282544496588)' fillRule='evenodd'>
        <path d='M-1.76 -1.67 L-153.54 0.46 L-155.29 95.6 L-0.3 95.44 L-1.32 -0.23' stroke='none' strokeWidth='0' fill={frontFill} fillRule='evenodd' />
        <path d='M0 0 C-50.46 0.94, -96.36 -1.91, -154.53 0 M0 0 C-36.76 1.95, -72.04 1.43, -154.53 0 M-154.53 0 C-156.39 31.51, -154.07 60.1, -154.53 96.54 M-154.53 0 C-154.67 25.04, -154.45 50.2, -154.53 96.54 M-154.53 96.54 C-102.96 96.29, -51.57 98.51, -1.06 96.54 M-154.53 96.54 C-106.28 95.97, -58.46 96.49, -1.06 96.54 M-1.06 96.54 C-0.55 62.57, -1.68 27.93, 0 0 M-1.06 96.54 C-1.38 73.13, -0.02 48.15, 0 0 M0 0 C0 0, 0 0, 0 0 M0 0 C0 0, 0 0, 0 0' stroke={strokeColor} strokeWidth='4' fill='none' />
      </g>
    </g>
  </svg>
)


export const LinearFolderCard = memo(function LinearFolderCard({ node }: Props) {
  const navigate = useNavigate()
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'
  const boardId = useGraphStore(state => state.boardId)
  const updateNodeByIdPersist = useGraphStore(state => state.updateNodeByIdPersist)

  const [labelEditing, setLabelEditing] = useState(false)
  const [labelDraft, setLabelDraft] = useState(node.data.label?.markdown || '')
  const inputRef = useRef<HTMLInputElement | null>(null)

  const displayLabel = normalizeLabel(node.data.label?.markdown)
  const textAlignClass = node.data.style.textAlign === 'left' ? 'text-left' : node.data.style.textAlign === 'right' ? 'text-right' : 'text-center'
  const fontClass = fontFamilyToTwClass(node.data.style.fontFamily)
  const sizeClass = fontSizeToTwClass(node.data.style.fontSize)
  const textStyleClass = textStyleToTwClass(node.data.style.textStyle)

  const displayBackground = isDark
    ? darkModeDisplayHex(node.data.style.backgroundColor) ?? '#dbeafe'
    : node.data.style.backgroundColor
  const iconBackFill = isDark
    ? lighterDisplayHex(displayBackground) ?? displayBackground
    : darkerDisplayHex(displayBackground) ?? displayBackground
  const iconFrontFill = displayBackground
  const displayTextColor = isDark
    ? darkModeDisplayHex(node.data.style.textColor) ?? '#e4e4e7'
    : node.data.style.textColor
  const displayStrokeColor = !isTransparent(node.data.style.strokeColor)
    ? (isDark ? darkModeDisplayHex(node.data.style.strokeColor) ?? '#1e1e1e' : node.data.style.strokeColor)
    : displayTextColor

  useEffect(() => {
    if (labelEditing) return
    setLabelDraft(node.data.label?.markdown || '')
  }, [labelEditing, node.data.label?.markdown])

  useEffect(() => {
    if (!labelEditing) return
    const frame = requestAnimationFrame(() => {
      inputRef.current?.focus()
      inputRef.current?.select()
    })
    return () => cancelAnimationFrame(frame)
  }, [labelEditing])

  const commitLabel = useCallback((nextRaw: string) => {
    const next = nextRaw.trim()
    const prev = node.data.label?.markdown?.trim() || ''
    if (next === prev) return
    updateNodeByIdPersist(node.id, prevNode => ({
      ...prevNode,
      data: {
        ...prevNode.data,
        label: next ? { markdown: next } : undefined,
      },
    }))
  }, [node.data.label?.markdown, node.id, updateNodeByIdPersist])

  const stopLabelEdit = useCallback((save: boolean) => {
    if (save) commitLabel(labelDraft)
    else setLabelDraft(node.data.label?.markdown || '')
    setLabelEditing(false)
  }, [commitLabel, labelDraft, node.data.label?.markdown])

  return (
    <div className='group relative w-full min-w-0'>
      <button
        type='button'
        onClick={() => {
          if (!boardId) return
          navigate({
            to: '/boards/$id',
            params: { id: boardId },
            search: (prev: Record<string, unknown>) => ({ ...prev, root_id: node.id }),
          })
        }}
        className='w-full min-h-[100px] max-h-[225px] rounded-md border-2 border-transparent bg-transparent transition-colors group-hover:bg-accent group-hover:border-border flex items-center justify-center p-3'
      >
        <div className='w-full max-w-[84px] aspect-square'>
          <FolderIcon
            backFill={iconBackFill}
            frontFill={iconFrontFill}
            strokeColor={displayStrokeColor}
          />
        </div>
      </button>

      <div className='mt-2 px-2'>
        {labelEditing ? (
          <input
            ref={inputRef}
            value={labelDraft}
            onChange={event => setLabelDraft(event.target.value)}
            onBlur={() => stopLabelEdit(true)}
            onKeyDown={event => {
              if (event.key === 'Enter') {
                event.preventDefault()
                stopLabelEdit(true)
              }
              if (event.key === 'Escape') {
                event.preventDefault()
                stopLabelEdit(false)
              }
            }}
            onMouseDown={event => event.stopPropagation()}
            onClick={event => event.stopPropagation()}
            className={`w-full bg-transparent border-0 border-b border-foreground/30 focus:border-secondary focus:outline-none px-0 py-0.5 ${textAlignClass} ${fontClass} ${sizeClass} ${textStyleClass}`}
            style={{ color: displayTextColor }}
            placeholder='Untitled folder'
          />
        ) : (
          <button
            type='button'
            onMouseDown={event => event.stopPropagation()}
            onClick={event => {
              event.stopPropagation()
              setLabelEditing(true)
            }}
            className={`block w-full truncate hover:underline ${textAlignClass} ${fontClass} ${sizeClass} ${textStyleClass}`}
            style={{ color: displayTextColor }}
            title={displayLabel}
          >
            {displayLabel}
          </button>
        )}
      </div>
    </div>
  )
})
