import { useReactFlow } from "@xyflow/react"
import type { Note } from "../types/note"
import TextareaAutosize from 'react-textarea-autosize'
import { useEffect, useRef, useState } from "react"
import type { NoteNode } from "../types/flow"
import { MdEditor } from "@/components/editor/milkdown"
import { MilkdownProvider } from "@milkdown/react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { fontFamilyToTwClass, fontSizeToTwClass, textStyleToTwClass } from "../types/style"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowDiagonalIcon } from "@hugeicons/core-free-icons"
import { clsx } from "clsx"
import { MarkdownView } from "@/components/markdown-view"


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

  const handleLabelChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
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

  const nodeType = note.style.type

  const labelClass = clsx(
    `
      relative
      bg-transparent
      overflow-visible
      w-[300px]
      min-h-[50px]
      flex items-center justify-center
      p-2
    `,
    nodeType === "sheet" ? `h-[300px] ${fontFamilyToTwClass(note.style.fontFamily)}` : ""
  )

  const divClass = `
    w-full h-full
    p-4
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

  const titleEditorClass = `
    text-3xl
    focus:outline-none
    focus:ring-0
    focus:border-none
    overflow-hidden
    whitespace-normal break-words
    resize-none
    w-full
  `

  return (
    <Dialog open={viewNote} onOpenChange={setViewNote}>
      <div
        className={labelClass}
        onDoubleClick={onDoubleClick}
        onPointerDown={stopDragging}
        style={{
          color: note.style.textColor || 'inherit',
        }}
      >
        {
          selected &&
          <div className='absolute top-2 inset-x-0 transform -translate-y-[calc(100%+0.5rem)] text-xs font-sans flex flex-row items-center justify-center gap-2 z-40'>
            <DialogTrigger asChild>
              <button
                className='transition-colors px-2 py-1 text-foreground/50 hover:text-foreground flex flex-row items-center justify-center gap-2'
              >
                <HugeiconsIcon icon={ArrowDiagonalIcon} className="size-4 shrink-0" strokeWidth={1.75} />
                <span>Edit Note</span>
              </button>
            </DialogTrigger>
          </div>
        }
        {
          nodeType === "sheet" ? (
            <div className='w-full h-full nodrag nopan nowheel cursor-text p-1'>
              <ScrollArea className='h-full w-full flex flex-col justify-start p-2'>
                <MarkdownView content={note.content?.markdown || ''} />
              </ScrollArea>
            </div>
          ) : (
            <div className='w-full h-full'>
              {
                labelEditing ? (
                  <TextareaAutosize
                    className={textareaClass}
                    value={note.label?.markdown || ''}
                    onChange={handleLabelChange}
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
          )
        }
      </div>
      <DialogContent className="sm:max-w-4xl h-3/4 flex flex-col items-center text-left p-2">
        {
          nodeType === "sheet" ? (
            <DialogHeader className='invisible'>
              <DialogTitle />
              <DialogDescription />
            </DialogHeader>
          ) : (
            <DialogHeader className='w-full'>
              <DialogTitle asChild>
                <div className='flex flex-row items-center gap-2 w-full pt-10 px-24'>
                  <TextareaAutosize
                    className={titleEditorClass}
                    value={note.label?.markdown || ''}
                    onChange={handleLabelChange}
                    placeholder=""
                  />
                </div>
              </DialogTitle>
              <DialogDescription className='invisible'>
                Note description
              </DialogDescription>
            </DialogHeader>
          )
        }
        <div className='min-h-0 flex-1 flex items-center w-full'>
          <ScrollArea className='h-full w-full'>
            <MilkdownProvider>
              <MdEditor markdown={note.content?.markdown || ''} onSave={handleNoteChange} />
            </MilkdownProvider>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  )
}