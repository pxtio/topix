import { useReactFlow } from "@xyflow/react"
import type { Note } from "../types/note"
import TextareaAutosize from 'react-textarea-autosize'
import { useEffect, useRef, useState } from "react"


/**
 * Component to render the label of a note node.
 */
export const NodeLabel = ({ note, selected }: { note: Note, selected: boolean }) => {
  const { setNodes } = useReactFlow()

  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  const [labelEditing, setLabelEditing] = useState(false)

  useEffect(() => {
    if (!selected) {
      setLabelEditing(false)
    }
  }, [selected])

  const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newLabel = event.target.value
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === note.id) {
          return {
            ...node,
            data: {
              ...node.data,
              label: newLabel,
            },
          }
        }
        return node
      })
    )
  }

  const stopDragging = (e: React.PointerEvent) => {
    if (labelEditing) {
      e.preventDefault() // prevent React Flow from starting a drag
    }
  }

  const onDoubleClick = () => {
    setLabelEditing(true)
    setTimeout(() => {
      const textarea = textareaRef.current
      if (!textarea) return
      textarea.focus()
      const len = textarea.value.length
      textarea.setSelectionRange(len, len)
    }, 0)
  }

  const textareaClass = `
    w-full h-full
    px-3 py-2
    bg-transparent
    ${note.style.textAlign === 'center' ? 'text-center' : note.style.textAlign === 'right' ? 'text-right' : 'text-left'}
    border-none
    resize-none
    font-handwriting
    focus:outline-none
    focus:ring-0
    focus:border-none
    overflow-visible
    whitespace-normal break-words
  `

  return (
    <div
      className={`
        relative
        flex flex-row items-center justify-center
        bg-transparent
        overflow-visible
        w-[250px]
        min-h-[50px]
      `}
      onDoubleClick={onDoubleClick}
      onPointerDown={stopDragging}
    >
      {
        labelEditing ? (
          <TextareaAutosize
            className={textareaClass}
            value={note.label || ''}
            onChange={handleChange}
            placeholder=""
            ref={textareaRef}
            readOnly={!labelEditing}
          />
        ) : (
          <div className={textareaClass}>
            <span>
              {note.label}
            </span>
          </div>
        )
      }
    </div>
  )
}