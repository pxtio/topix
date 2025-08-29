import { useReactFlow } from "@xyflow/react"
import type { Note } from "../types/note"
import TextareaAutosize from 'react-textarea-autosize'
import { useEffect, useRef, useState } from "react"
import { IconPicker } from "./emoji-picker/picker"
import type { NoteNode } from "../types/flow"
import { MdEditor } from "@/components/editor/milkdown"
import { MilkdownProvider } from "@milkdown/react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { fontFamilyToTwClass, fontSizeToTwClass, textStyleToTwClass } from "../types/style"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"


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
              label: {
                markdown: newLabel
              },
            },
          } as NoteNode
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
                  type: "icon",
                  icon: { type: 'emoji', emoji: emoji.emoji }
                }
              }
            } as Note,
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
      e.stopPropagation() // prevent React Flow from starting a drag
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

  const divClass = `
    w-full h-full
    p-6
    ${note.style.textAlign === 'center' ? 'text-center' : note.style.textAlign === 'right' ? 'text-right' : 'text-left'}
    border-none
    resize-none
    ${textStyleToTwClass(note.style.textStyle)}
    ${fontFamilyToTwClass(note.style.fontFamily)}
    ${fontSizeToTwClass(note.style.fontSize)}
    focus:outline-none
    focus:ring-0
    focus:border-none
    overflow-hidden
    whitespace-normal break-words
  `

  const textareaClass = `${divClass} nodrag nopan nowheel`

  return (
    <Dialog open={viewNote} onOpenChange={setViewNote}>
      <div
        className={`
          relative
          flex flex-row items-center justify-center
          bg-transparent
          overflow-visible
        `}
      >
        {
          selected &&
          <div className='absolute top-0 left-0 transform translate-y-[-100%] text-xs font-sans flex flex-row items-center gap-2'>
            <IconPicker onSelect={handleEmojiSelect} />
            <DialogTrigger asChild>
              <button
                className='transition-colors px-2 py-1 text-accent-foreground/50 hover:text-accent-foreground'
              >
                {viewNote ? 'Hide Note' : 'Show Note'}
              </button>
            </DialogTrigger>
          </div>
        }
        {
          note.properties?.emoji?.icon?.type === 'emoji' && note.properties?.emoji?.icon?.emoji && (
            <div className={`
              p-2
            `}>
              {note.properties.emoji.icon.emoji}
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
            p-2
          `}
          onDoubleClick={onDoubleClick}
          onPointerDown={stopDragging}
          style={{
            color: note.style.textColor || 'inherit',
          }}
        >
          {
            labelEditing ? (
              <TextareaAutosize
                className={textareaClass}
                value={note.label?.markdown || ''}
                onChange={handleChange}
                placeholder=""
                ref={textareaRef}
                readOnly={!labelEditing}
              />
            ) : (
              <div className={divClass}>
                <span>
                  {note.label?.markdown || ""}
                </span>
              </div>
            )
          }
        </div>
        <DialogContent className="sm:max-w-4xl h-3/4 flex flex-col items-center text-left p-2">
          <DialogHeader className='w-full'>
            <DialogTitle asChild>
              <div className='flex flex-row items-center gap-2 w-full'>
                {
                  note.properties?.emoji?.icon?.type === 'emoji' && note.properties?.emoji?.icon?.emoji && (
                    <div className={`
                      p-2
                      text-3xl
                    `}>
                      {note.properties.emoji.icon.emoji}
                    </div>
                  )
                }
                <h1 className='text-3xl'>{note.label?.markdown || ""}</h1>
              </div>
            </DialogTitle>
            <DialogDescription className='invisible'>
              Note description
            </DialogDescription>
          </DialogHeader>
          <div className='min-h-0 flex-1 flex items-center w-full'>
            <ScrollArea className='h-full w-full'>
              <MilkdownProvider>
                <MdEditor markdown={note.content?.markdown || ''} onSave={handleNoteChange} />
              </MilkdownProvider>
            </ScrollArea>
          </div>
        </DialogContent>
      </div>
    </Dialog>
  )
}