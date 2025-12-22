import { memo } from 'react'
import TextareaAutosize from 'react-textarea-autosize'
import { EdgeLabelRenderer } from '@xyflow/react'
import { LiteMarkdown } from '@/components/markdown/lite-markdown'

type EdgeLabelProps = {
  labelText: string
  labelDraft: string
  isEditing: boolean
  onChange?: (value: string) => void
  labelInputRef: React.RefObject<HTMLTextAreaElement | null>
  transformStyle: { transform: string }
  handleLabelBlur: () => void
  handleLabelKeyDown: (event: React.KeyboardEvent<HTMLTextAreaElement>) => void
}

export const EdgeLabel = memo(function EdgeLabel({
  labelText,
  labelDraft,
  isEditing,
  onChange,
  labelInputRef,
  transformStyle,
  handleLabelBlur,
  handleLabelKeyDown
}: EdgeLabelProps) {
  return (
    <EdgeLabelRenderer>
      <div
        className={`nodrag nopan absolute origin-center ${isEditing ? 'pointer-events-auto' : 'pointer-events-none'}`}
        style={transformStyle}
        onPointerDown={event => event.stopPropagation()}
      >
        {isEditing ? (
          <TextareaAutosize
            ref={labelInputRef}
            value={labelDraft}
            onChange={event => onChange?.(event.target.value)}
            onBlur={handleLabelBlur}
            onKeyDown={handleLabelKeyDown}
            placeholder='Add label...'
            className='text-center text-base px-2 py-1 bg-background focus:outline-none min-w-[160px] resize-none max-w-[240px] font-handwriting'
            minRows={1}
            maxRows={4}
          />
        ) : (
          <div className='text-center px-2 py-1 bg-background text-base text-card-foreground max-w-[240px] font-handwriting'>
            <LiteMarkdown text={labelText} />
          </div>
        )}
      </div>
    </EdgeLabelRenderer>
  )
})
