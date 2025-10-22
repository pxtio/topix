import TextareaAutosize from 'react-textarea-autosize'
import { memo } from 'react'
import type { RefObject } from 'react'
import type { NodeType } from '../../types/style'
import { IconShape } from './icon-shape'
import { ImageShape } from './image-shape'

type TextAlign = 'left' | 'center' | 'right'

interface ShapeProps {
  nodeType: NodeType
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
  icon?: string
  imageUrl?: string
}


/**
 * Component representing a shape with editable text.
 */
export const Shape = memo(function Shape({
  nodeType,
  value,
  labelEditing,
  onChange,
  textareaRef,
  textAlign,
  styleHelpers,
  contentRef,
  icon,
  imageUrl
}: ShapeProps) {
  const base = `
    w-full p-2 border-none resize-none
    focus:outline-none focus:ring-0 focus:border-none
    overflow-hidden whitespace-normal break-words
    ${styleHelpers.text} ${styleHelpers.font} ${styleHelpers.size}
    ${textAlign === 'center' ? 'text-center' : textAlign === 'right' ? 'text-right' : 'text-left'}
  `

  const placeHolder = nodeType === 'text' ? 'Add text...' : ''

  const notEditingSpanClass = value.trim() ? '' : 'text-muted-foreground/50'

  return (
    <div className='w-full h-full flex items-center justify-center'>
      <div className='w-full' ref={contentRef}>
        {icon && <IconShape iconName={icon} className="mt-1" />}
        {imageUrl && <ImageShape imageUrl={imageUrl} className="mt-1 mb-2" />}
        {labelEditing ? (
          <TextareaAutosize
            className={`${base} nodrag nopan nowheel !-mb-2`}
            value={value}
            onChange={onChange}
            placeholder={placeHolder}
            ref={textareaRef}
            readOnly={!labelEditing}
          />
        ) : (
          <div className={`${base} whitespace-pre-wrap`}>
            <span className={notEditingSpanClass}>{value || placeHolder}</span>
          </div>
        )}
      </div>
    </div>
  )
})
