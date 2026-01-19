import { memo, useEffect, useRef } from 'react'
import TextareaAutosize from 'react-textarea-autosize'
import { EdgeLabelRenderer } from '@xyflow/react'
import { LiteMarkdown } from '@/components/markdown/lite-markdown'


/**
 * Props for the EdgeLabel component.
 */
type EdgeLabelProps = {
  labelText: string
  labelColor?: string
  labelDraft: string
  isEditing: boolean
  onChange?: (value: string) => void
  onSizeChange?: (size: { width: number; height: number }) => void
  labelInputRef: React.RefObject<HTMLTextAreaElement | null>
  transformStyle: { transform: string }
  handleLabelBlur: () => void
  handleLabelKeyDown: (event: React.KeyboardEvent<HTMLTextAreaElement>) => void
}


/**
 * Edge label component for displaying and editing edge labels in a flowchart.
 */
export const EdgeLabel = memo(function EdgeLabel({
  labelText,
  labelColor,
  labelDraft,
  isEditing,
  onChange,
  onSizeChange,
  labelInputRef,
  transformStyle,
  handleLabelBlur,
  handleLabelKeyDown
}: EdgeLabelProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const node = wrapperRef.current
    if (!node || !onSizeChange) return

    const reportSize = () => {
      const width = node.offsetWidth
      const height = node.offsetHeight
      onSizeChange({ width, height })
    }

    reportSize()
    const observer = new ResizeObserver(reportSize)
    observer.observe(node)

    return () => observer.disconnect()
  }, [onSizeChange])

  return (
    <EdgeLabelRenderer>
      <div
        ref={wrapperRef}
        className={`nodrag nopan absolute origin-center z-[1001] ${isEditing ? 'pointer-events-auto' : 'pointer-events-none'}`}
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
            className='text-center text-base px-2 py-1 bg-transparent focus:outline-none min-w-[160px] resize-none max-w-[240px] font-handwriting'
            minRows={1}
            maxRows={4}
            style={{ color: labelColor ?? 'inherit' }}
          />
        ) : (
          <div
            className='text-center px-2 py-1 bg-transparent text-base text-card-foreground max-w-[240px] font-handwriting'
            style={{ color: labelColor ?? 'inherit' }}
          >
            <LiteMarkdown text={labelText} />
          </div>
        )}
      </div>
    </EdgeLabelRenderer>
  )
})
