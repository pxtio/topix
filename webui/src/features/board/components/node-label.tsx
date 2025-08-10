import { useReactFlow } from "@xyflow/react"
import type { Note } from "../types/note"
import TextareaAutosize from 'react-textarea-autosize'
import { useEffect, useRef, useState } from "react"
import { IconPicker } from "./emoji-picker/picker"
import type { NoteNode } from "../types/flow"
import { MdEditor } from "@/components/editor/milkdown"
import { MilkdownProvider } from "@milkdown/react"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"


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
    <Sheet open={viewNote} onOpenChange={setViewNote}>
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
            <SheetTrigger asChild>
              <button
                className='transition-colors px-2 py-1 text-accent-foreground/50 hover:text-accent-foreground'
              >
                {viewNote ? 'Hide Note' : 'Show Note'}
              </button>
            </SheetTrigger>
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
        <SheetContent className="sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle asChild>
              <div className='flex flex-row items-center gap-2'>
                {
                  note.properties?.emoji?.prop.icon?.type === 'emoji' && note.properties?.emoji?.prop.icon?.emoji && (
                    <div className={`
                      p-2
                      text-3xl
                    `}>
                      {note.properties.emoji.prop.icon.emoji}
                    </div>
                  )
                }
                <h1 className='text-3xl'>{note.label}</h1>
              </div>
            </SheetTitle>
            <SheetDescription className='invisible'>
              Note description
            </SheetDescription>
          </SheetHeader>
          <MilkdownProvider>
            <MdEditor markdown={note.content?.markdown || ''} onSave={handleNoteChange} />
          </MilkdownProvider>
        </SheetContent>
      </div>
    </Sheet>
  )
}