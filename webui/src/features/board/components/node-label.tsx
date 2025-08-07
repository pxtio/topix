import { useReactFlow } from "@xyflow/react"
import type { Note } from "../types/note"
import TextareaAutosize from 'react-textarea-autosize'
import { useEffect, useRef, useState } from "react"
import { IconPicker } from "./emoji-picker/picker"
import type { NoteNode } from "../types/flow"
import { MarkdownEditor } from "@/components/editor/text-editor"


/**
 * Component to render the label of a note node.
 */
export const NodeLabel = ({ note, selected }: { note: Note, selected: boolean }) => {
  const [viewNote, setViewNote] = useState<boolean>(false)

  const { setNodes } = useReactFlow()

  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  const [labelEditing, setLabelEditing] = useState(false)

  useEffect(() => {
    if (!selected) {
      setLabelEditing(false)
      setViewNote(false)
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

  const handleEmojiSelect = (emoji: { emoji: string }) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === note.id) {
          const nde = node as NoteNode
          return {
            ...nde,
            data: {
              ...nde.data,
              properties: {
                ...nde.data.properties,
                emoji: {
                  prop: {
                    type: "icon",
                    icon: { type: 'emoji', emoji: emoji.emoji }
                  }
                }
              }
            },
          }
        }
        return node
      })
    )
  }

  const handleNoteClick = () => {
    setViewNote(!viewNote)
  }

  const handleNoteChange = (markdown: string) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === note.id) {
          return {
            ...node,
            data: {
              ...node.data,
              content: {
                markdown: markdown
              }
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
      `}
    >
      {
        selected &&
        <div className='absolute top-0 left-0 transform translate-y-[-100%] text-xs font-sans flex flex-row items-center gap-2'>
          <IconPicker onSelect={handleEmojiSelect} />
          <button
            className='transition-colors px-2 py-1 text-accent-foreground/50 hover:text-accent-foreground'
            onClick={handleNoteClick}
          >
            {viewNote ? 'Hide Note' : 'Show Note'}
          </button>
        </div>
      }
      {
        note.properties?.emoji?.prop.icon?.type === 'emoji' && note.properties?.emoji?.prop.icon?.emoji && (
          <div className={`
            p-2
          `}>
            {note.properties.emoji.prop.icon.emoji}
          </div>
        )
      }
      <div
        className={`
          relative
          bg-transparent
          overflow-visible
          w-[250px]
          min-h-[50px]
          flex items-center justify-center
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
      {
        viewNote && (
          <div className='absolute -bottom-1 left-1/2 transform translate-y-[100%] -translate-x-1/2 font-sans bg-card text-card-foreground rounded-xl border border-border p-4 shadow-md w-96'>
            <MarkdownEditor markdown={note.content?.markdown || ''} onChange={handleNoteChange} readonly={false} />
          </div>
        )
      }
    </div>
  )
}