import TextareaAutosize from 'react-textarea-autosize'
import { memo } from 'react'
import type { RefObject } from 'react'
import type { NodeType } from '../../types/style'
import { IconShape } from './icon-shape'
import { ImageShape } from './image-shape'
import { LiteMarkdown } from '@/components/markdown/lite-markdown'

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

  const isImageNode = nodeType === 'image'
  const placeHolder = nodeType === 'text' ? 'Add text...' : isImageNode ? 'Add caption...' : ''

  const notEditingSpanClass = value.trim() ? '' : 'text-muted-foreground/50'

  if (isImageNode) {
    const hasLabel = value.trim().length > 0

    return (
      <div className='relative w-full h-full rounded-md'>
        <div className='absolute inset-0 flex items-center justify-center'>
          {imageUrl ? (
            <ImageShape imageUrl={imageUrl} className="w-full h-full" />
          ) : (
            <div className='w-full h-full flex items-center justify-center text-sm text-muted-foreground/60'>
              No image selected
            </div>
          )}
        </div>

        <div className={`absolute left-3 right-3 -bottom-4 transform translate-y-1/2 flex justify-center z-10 ${labelEditing ? '' : 'pointer-events-none'}`}>
          {labelEditing ? (
            <TextareaAutosize
              className='nodrag nopan nowheel w-full border border-border rounded-md bg-background/90 text-sm text-center shadow-sm px-3 py-2'
              value={value}
              onChange={onChange}
              placeholder={placeHolder}
              ref={textareaRef}
              minRows={1}
            />
          ) : hasLabel ? (
            <LiteMarkdown
              text={value}
              className='px-3 py-1 rounded-md text-sm text-center bg-background/70 backdrop-blur shadow-sm text-card-foreground'
            />
          ) : (
            <div className='px-3 py-1 rounded-md text-sm text-center bg-background/70 backdrop-blur shadow-sm text-muted-foreground/70'>
              {placeHolder}
            </div>
          )}
        </div>
      </div>
    )
  }

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
            {value.trim() ? (
              <LiteMarkdown text={value} className='block' />
            ) : (
              <span className={notEditingSpanClass}>{placeHolder}</span>
            )}
          </div>
        )}
      </div>
    </div>
  )
})
