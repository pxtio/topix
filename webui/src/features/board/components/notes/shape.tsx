import TextareaAutosize from 'react-textarea-autosize'
import { memo, useCallback } from 'react'
import type { RefObject, KeyboardEvent as ReactKeyboardEvent } from 'react'
import type { FontFamily, FontSize, NodeType, TextStyle } from '../../types/style'
import { IconShape } from './icon-shape'
import { ImageShape } from './image-shape'
import { LiteMarkdown } from '@/components/markdown/lite-markdown'
import { CanvasLiteMarkdown } from '@/components/markdown/canvas-lite-markdown'
import { getShapeContentScale } from '../../utils/shape-content-scale'
import { useGraphStore } from '../../store/graph-store'


type TextAlign = 'left' | 'center' | 'right'
const MARKDOWN_RENDER_SCALE = 1
const hasMathSyntax = (value: string) => value.includes('$$')


/**
 * Props for the shape renderer used by note content.
 */
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
  renderWidth?: number
  renderHeight?: number
  renderTextColor?: string
  renderFontFamily: FontFamily
  renderFontSize: FontSize
  renderTextStyle: TextStyle
}


/**
 * Shared props for editable textarea inputs used inside shapes.
 */
type TextareaInputProps = {
  className: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  onKeyDown: (event: ReactKeyboardEvent<HTMLTextAreaElement>) => void
  placeholder: string
  textareaRef?: RefObject<HTMLTextAreaElement | null>
  minRows?: number
  readOnly?: boolean
}


/**
 * Reusable autosizing textarea wrapper for shape editing surfaces.
 */
const TextareaInput = memo(function TextareaInput({
  className,
  value,
  onChange,
  onKeyDown,
  placeholder,
  textareaRef,
  minRows,
  readOnly,
}: TextareaInputProps) {
  return (
    <TextareaAutosize
      className={className}
      value={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      ref={textareaRef}
      minRows={minRows}
      readOnly={readOnly}
    />
  )
})


/**
 * Props for rendering image node content with optional caption overlay.
 */
type ImageNodeViewProps = {
  imageUrl?: string
  value: string
  labelEditing: boolean
  isResizingNode: boolean
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  onKeyDown: (event: ReactKeyboardEvent<HTMLTextAreaElement>) => void
  placeholder: string
  textareaRef?: RefObject<HTMLTextAreaElement | null>
  renderWidth?: number
  renderHeight?: number
  renderTextColor?: string
  renderFontFamily: FontFamily
  renderFontSize: FontSize
  renderTextStyle: TextStyle
  zoom: number
  isMoving: boolean
}


/**
 * Image node renderer that overlays editable markdown caption content.
 */
const ImageNodeView = memo(function ImageNodeView({
  imageUrl,
  value,
  labelEditing,
  isResizingNode,
  onChange,
  onKeyDown,
  placeholder,
  textareaRef,
  renderWidth,
  renderHeight,
  renderTextColor,
  renderFontFamily,
  renderFontSize,
  renderTextStyle,
  zoom,
  isMoving,
}: ImageNodeViewProps) {
  const hasLabel = value.trim().length > 0
  const renderMathWithDom = hasMathSyntax(value)

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
          <TextareaInput
            className='nodrag nopan nowheel w-full border border-border rounded-md bg-background/90 text-sm text-center shadow-sm px-3 py-2'
            value={value}
            onChange={onChange}
            onKeyDown={onKeyDown}
            placeholder={placeholder}
            textareaRef={textareaRef}
            minRows={1}
            readOnly={false}
          />
        ) : isResizingNode && hasLabel ? (
          <LiteMarkdown
            text={value}
            className='px-3 py-1 rounded-md text-sm text-center bg-background/70 backdrop-blur shadow-sm text-card-foreground'
          />
        ) : hasLabel ? (
          renderMathWithDom ? (
            <LiteMarkdown
              text={value}
              className='px-3 py-1 rounded-md text-sm text-center bg-background/70 backdrop-blur shadow-sm text-card-foreground'
            />
          ) : (
          <CanvasLiteMarkdown
            text={value}
            className='px-3 py-1 rounded-md text-sm text-center bg-background/70 backdrop-blur shadow-sm text-card-foreground'
            width={renderWidth ? Math.max(60, renderWidth - 24) : 280}
            height={renderHeight ? Math.max(40, Math.floor(renderHeight * 0.35)) : 90}
            renderScale={MARKDOWN_RENDER_SCALE}
            zoom={zoom}
            isMoving={isMoving}
            align='center'
            textColor={renderTextColor}
            fontFamily={renderFontFamily}
            fontSize={renderFontSize}
            textStyle={renderTextStyle}
          />
          )
        ) : (
          <div className='px-3 py-1 rounded-md text-sm text-center bg-background/70 backdrop-blur shadow-sm text-muted-foreground/70'>
            {placeholder}
          </div>
        )}
      </div>
    </div>
  )
})


/**
 * Props for rendering icon-only node content.
 */
type IconNodeViewProps = {
  icon?: string
  contentRef: RefObject<HTMLDivElement | null>
}


/**
 * Icon node renderer with centered icon preview.
 */
const IconNodeView = memo(function IconNodeView({ icon, contentRef }: IconNodeViewProps) {
  return (
    <div className='w-full h-full flex items-center justify-center'>
      <div className='w-full' ref={contentRef}>
        {icon && <IconShape iconName={icon} />}
      </div>
    </div>
  )
})


/**
 * Props for rendering standard text-like shape content.
 */
type TextNodeViewProps = {
  value: string
  labelEditing: boolean
  isResizingNode: boolean
  contentRef: RefObject<HTMLDivElement | null>
  contentSize: string
  baseClassName: string
  notEditingSpanClass: string
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  onKeyDown: (event: ReactKeyboardEvent<HTMLTextAreaElement>) => void
  placeholder: string
  textareaRef?: RefObject<HTMLTextAreaElement | null>
  renderWidth?: number
  renderHeight?: number
  textAlign: TextAlign
  renderTextColor?: string
  renderFontFamily: FontFamily
  renderFontSize: FontSize
  renderTextStyle: TextStyle
  zoom: number
  isMoving: boolean
}


/**
 * Text shape renderer for markdown display and textarea editing modes.
 */
const TextNodeView = memo(function TextNodeView({
  value,
  labelEditing,
  isResizingNode,
  contentRef,
  contentSize,
  baseClassName,
  notEditingSpanClass,
  onChange,
  onKeyDown,
  placeholder,
  textareaRef,
  renderWidth,
  renderHeight,
  textAlign,
  renderTextColor,
  renderFontFamily,
  renderFontSize,
  renderTextStyle,
  zoom,
  isMoving,
}: TextNodeViewProps) {
  const renderMathWithDom = hasMathSyntax(value)
  return (
    <div className='w-full h-full flex items-center justify-center'>
      <div
        className='flex items-center justify-center'
        style={{ width: contentSize }}
        ref={contentRef}
      >
        {labelEditing ? (
          <TextareaInput
            className={`${baseClassName} nodrag nopan nowheel`}
            value={value}
            onChange={onChange}
            onKeyDown={onKeyDown}
            placeholder={placeholder}
            textareaRef={textareaRef}
            readOnly={false}
          />
        ) : isResizingNode ? (
          <div className={`${baseClassName} whitespace-pre-wrap`}>
            {value.trim() ? (
              <LiteMarkdown text={value} className='block' />
            ) : (
              <span className={notEditingSpanClass}>{placeholder}</span>
            )}
          </div>
        ) : (
          <div className={`${baseClassName} whitespace-pre-wrap`}>
            {value.trim() ? (
              renderMathWithDom ? (
                <LiteMarkdown text={value} className='block' />
              ) : (
                <CanvasLiteMarkdown
                  text={value}
                  className='block'
                  width={renderWidth}
                  height={renderHeight}
                  renderScale={MARKDOWN_RENDER_SCALE}
                  zoom={zoom}
                  isMoving={isMoving}
                  align={textAlign}
                  textColor={renderTextColor}
                  fontFamily={renderFontFamily}
                  fontSize={renderFontSize}
                  textStyle={renderTextStyle}
                />
              )
            ) : (
              <span className={notEditingSpanClass}>{placeholder}</span>
            )}
          </div>
        )}
      </div>
    </div>
  )
})


/**
 * Shape: top-level content renderer for image/icon/text-like note variants.
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
  imageUrl,
  renderWidth,
  renderHeight,
  renderTextColor,
  renderFontFamily,
  renderFontSize,
  renderTextStyle,
}: ShapeProps) {
  const zoom = useGraphStore(state => state.zoom ?? 1)
  const isMoving = useGraphStore(state => state.isMoving)
  const isResizingNode = useGraphStore(state => state.isResizingNode)
  const paddingClass = nodeType === 'text' ? 'p-0' : 'p-2'
  const base = `
    w-full ${paddingClass} border-none resize-none
    focus:outline-none focus:ring-0 focus:border-none
    overflow-hidden whitespace-normal break-words
    ${styleHelpers.text} ${styleHelpers.font} ${styleHelpers.size}
    ${textAlign === 'center' ? 'text-center' : textAlign === 'right' ? 'text-right' : 'text-left'}
  `

  const isImageNode = nodeType === 'image'
  const isIconNode = nodeType === 'icon'
  const placeHolder = nodeType === 'text' ? 'Add text...' : isImageNode ? 'Add caption...' : ''
  const contentScale = getShapeContentScale(nodeType)
  const contentSize = contentScale < 1 ? `${contentScale * 100}%` : '100%'
  const notEditingSpanClass = value.trim() ? '' : 'text-muted-foreground/50'

  const handleTextareaKeyDown = useCallback((event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== 'Tab') return
    event.preventDefault()
    const textarea = event.currentTarget
    const insert = '  '
    const start = textarea.selectionStart ?? 0
    const end = textarea.selectionEnd ?? start
    textarea.setRangeText(insert, start, end, 'end')
    const nativeEvent = new Event('input', { bubbles: true })
    textarea.dispatchEvent(nativeEvent)
  }, [])

  if (isImageNode) {
    return (
      <ImageNodeView
        imageUrl={imageUrl}
        value={value}
        labelEditing={labelEditing}
        isResizingNode={isResizingNode}
        onChange={onChange}
        onKeyDown={handleTextareaKeyDown}
        placeholder={placeHolder}
        textareaRef={textareaRef}
        renderWidth={renderWidth}
        renderHeight={renderHeight}
        renderTextColor={renderTextColor}
        renderFontFamily={renderFontFamily}
        renderFontSize={renderFontSize}
        renderTextStyle={renderTextStyle}
        zoom={zoom}
        isMoving={isMoving}
      />
    )
  }

  if (isIconNode) {
    return <IconNodeView icon={icon} contentRef={contentRef} />
  }

  return (
    <TextNodeView
      value={value}
      labelEditing={labelEditing}
      isResizingNode={isResizingNode}
      contentRef={contentRef}
      contentSize={contentSize}
      baseClassName={base}
      notEditingSpanClass={notEditingSpanClass}
      onChange={onChange}
      onKeyDown={handleTextareaKeyDown}
      placeholder={placeHolder}
      textareaRef={textareaRef}
      renderWidth={renderWidth ? Math.floor(renderWidth * Math.min(1, contentScale)) : undefined}
      renderHeight={renderHeight}
      textAlign={textAlign}
      renderTextColor={renderTextColor}
      renderFontFamily={renderFontFamily}
      renderFontSize={renderFontSize}
      renderTextStyle={renderTextStyle}
      zoom={zoom}
      isMoving={isMoving}
    />
  )
})
