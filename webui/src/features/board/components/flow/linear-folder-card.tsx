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
    viewBox='0 0 239.61675180640952 196.9211981510229'
    className='w-full h-full'
    aria-hidden='true'
  >
    <rect x='0' y='0' width='239.61675180640952' height='196.9211981510229' fill='transparent' />
    <g strokeLinecap='round'>
      <g transform='translate(11.527037480708259 10.079258316532616) rotate(0 108.28133842249648 88.38134075897881)' fillRule='evenodd'>
        <path d='M0.55 0 L88.49 1.43 L117.89 30.93 L218.16 29.53 L219.47 175.97 L-0.69 176.11 L-0.41 0.92' stroke='none' strokeWidth='0' fill={backFill} fillRule='evenodd' />
        <path d='M0 0 C19.64 0.71, 39.04 0.69, 87.5 0 M0 0 C28.25 -0.31, 56.76 0.41, 87.5 0 M87.5 0 C97.47 8.86, 105.42 16.59, 119 31.5 M87.5 0 C94.47 6.84, 102.49 14.49, 119 31.5 M119 31.5 C143.71 30.93, 170.71 31.47, 217.5 31.5 M119 31.5 C142.54 29.82, 165.91 31.33, 217.5 31.5 M217.5 31.5 C218.59 74.15, 215.83 118.08, 217.5 176 M217.5 31.5 C218.89 71.6, 217.36 109.44, 217.5 176 M217.5 176 C147.6 177.29, 76.5 176.94, 0 176 M217.5 176 C155.51 175.84, 95.08 176.11, 0 176 M0 176 C-0.97 105.34, -2.89 36.72, 0 0 M0 176 C-0.04 117.48, 0.31 59.89, 0 0 M0 0 C0 0, 0 0, 0 0 M0 0 C0 0, 0 0, 0 0' stroke={strokeColor} strokeWidth='2' fill='none' />
      </g>
    </g>
    <g strokeLinecap='round'>
      <g transform='translate(228.52703748070826 41.579258316532616) rotate(0 -109.14308751488099 71.71380597043736)' fillRule='evenodd'>
        <path d='M0.43 1.38 L-217.1 1.54 L-218.24 143.53 L-0.39 143.92 L1.34 -0.47' stroke='none' strokeWidth='0' fill={frontFill} fillRule='evenodd' />
        <path d='M0 0 C-47.07 -1.15, -91.14 -0.25, -218 0 M0 0 C-46.6 2.02, -92.15 1.23, -218 0 M-218 0 C-216.69 56.45, -219.07 110.59, -218 144 M-218 0 C-218.02 42.57, -217.21 83.99, -218 144 M-218 144 C-172.21 141.84, -128.41 143.93, -1.5 144 M-218 144 C-164.82 143.35, -110.26 143.78, -1.5 144 M-1.5 144 C-0.59 112.38, -0.56 78.07, 0 0 M-1.5 144 C-0.33 100.32, -0.34 56, 0 0 M0 0 C0 0, 0 0, 0 0 M0 0 C0 0, 0 0, 0 0' stroke={strokeColor} strokeWidth='2' fill='none' />
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
