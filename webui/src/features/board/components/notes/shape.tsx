import TextareaAutosize from 'react-textarea-autosize'
import { memo } from 'react'
import type { RefObject } from 'react'

type TextAlign = 'left' | 'center' | 'right'

interface ShapeProps {
  value: string
  labelEditing: boolean
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  textareaRef?: RefObject<HTMLTextAreaElement | null>
  textAlign: TextAlign
  styleHelpers: {
    text: string
    font: string
    size: string
  }
  contentRef: RefObject<HTMLDivElement | null>
}

export const Shape = memo(function Shape({
  value,
  labelEditing,
  onChange,
  textareaRef,
  textAlign,
  styleHelpers,
  contentRef,
}: ShapeProps) {
  const base = `
    w-full p-4 border-none resize-none
    focus:outline-none focus:ring-0 focus:border-none
    overflow-hidden whitespace-normal break-words
    ${styleHelpers.text} ${styleHelpers.font} ${styleHelpers.size}
    ${textAlign === 'center' ? 'text-center' : textAlign === 'right' ? 'text-right' : 'text-left'}
  `

  return (
    <div className='w-full h-full flex items-center justify-center'>
      <div className='w-full' ref={contentRef}>
        {labelEditing ? (
          <TextareaAutosize
            className={`${base} nodrag nopan nowheel`}
            value={value}
            onChange={onChange}
            placeholder=""
            ref={textareaRef}
            readOnly={!labelEditing}
          />
        ) : (
          <div className={`${base} whitespace-pre-wrap`}>
            <span>{value || ''}</span>
          </div>
        )}
      </div>
    </div>
  )
})
