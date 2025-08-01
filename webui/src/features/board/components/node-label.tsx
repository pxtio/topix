import { useBoardStore } from "../store/board-store"
import type { Note } from "../types/note"
import TextareaAutosize from 'react-textarea-autosize'


/**
 * Component to render the label of a note node.
 */
export const NodeLabel = ({ note }: { note: Note }) => {
  const updateNote = useBoardStore((state) => state.updateNote)

  const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newLabel = event.target.value
    updateNote(note.id, { label: newLabel })
  }

  const textareaClass = `
    w-full h-full
    bg-transparent
    ${note.style.textAlign === 'center' ? 'text-center' : note.style.textAlign === 'right' ? 'text-right' : 'text-left'}
    border-none
    resize-none
    font-handwriting
  `
  return (
    <div className={`
      relative
      flex flex-row items-center justify-center
      bg-transparent
    `}>
      <TextareaAutosize
        className={textareaClass}
        value={note.label || ''}
        onChange={handleChange}
        placeholder="Enter label"
      />
    </div>
  )
}