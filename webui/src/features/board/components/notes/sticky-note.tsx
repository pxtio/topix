import { MarkdownView } from '@/components/markdown/markdown-view'
import { memo } from 'react'

interface StickyNoteProps {
  content: string
}

/**
 * StickyNote: renders the compact preview for nodes of type "sheet".
 * Single click anywhere inside opens the dialog (if onOpen provided).
 */
export const StickyNote = memo(function StickyNote({ content }: StickyNoteProps) {
  return (
    <div
      className='w-full h-full nodrag nopan nowheel cursor-pointer p-0'
      tabIndex={0}
    >
      <div className='h-full w-full flex flex-col justify-start p-2 overflow-auto scrollbar-thin'>
        <div className='min-w-0 w-full'>
          <MarkdownView content={content || ''} />
        </div>
      </div>
    </div>
  )
})