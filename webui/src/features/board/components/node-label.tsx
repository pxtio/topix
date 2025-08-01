import { useReactFlow } from "@xyflow/react"
import { useBoardStore } from "../store/board-store"
import type { Note } from "../types/note"
import TextareaAutosize from 'react-textarea-autosize'


/**
 * Component to render the label of a note node.
 */
export const NodeLabel = ({ note }: { note: Note }) => {
  const { setNodes } = useReactFlow()
  const updateNote = useBoardStore((state) => state.updateNote)

  const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newLabel = event.target.value
    updateNote(note.id, { label: newLabel })
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
  `
  return (
    <div className={`
      relative
      flex flex-row items-center justify-center
      bg-transparent
      overflow-visible
    `}>
      <TextareaAutosize
        className={textareaClass}
        value={note.label || ''}
        onChange={handleChange}
        placeholder=""
      />
    </div>
  )
}