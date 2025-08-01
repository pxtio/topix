import {
  BubbleMenu, Editor
} from '@tiptap/react'
import { Bold, Code, Italic, List, ListOrdered, Strikethrough, Terminal, Underline } from 'lucide-react'
import { Separator } from '@/components/ui/separator'


interface EditorMenuButtonProps {
  handleClick: () => void
  editor: Editor
  isActive: boolean
  className?: string
  children?: React.ReactNode
}


/**
 * Bubble menu button component for the Tiptap editor.
 */
const EditorMenuButton: React.FC<EditorMenuButtonProps> = ({
  handleClick,
  editor,
  isActive,
  children
}) => {
  if (!editor) {
    return null
  }
  const styleClassName = isActive ? "transition-all p-1 w-6 h-6 rounded flex items-center hover:bg-accent text-accent-foreground" :
    "transition-all p-1 w-6 h-6 rounded flex items-center hover:bg-accent text-accent-foreground"
  return (
    <button
      onClick={handleClick}
      className={styleClassName}
    >
      {children}
    </button>
  )
}

/**
 * Props for the EditorMenu component.
 * @property {Editor} [editor] - The Tiptap editor instance.
 */
export interface EditorMenuProps {
  editor: Editor | null
}


/**
 * EditorMenu component renders a bubble menu for text formatting options in the Tiptap editor.
 * It includes buttons for bold, italic, underline, strikethrough, bullet list, ordered list, code, and code block.
 *
 * @param {EditorMenuProps} props - The props for the component.
 * @returns {JSX.Element|null} The rendered bubble menu or null if no editor is provided.
 */
export const EditorMenu = ({ editor }: EditorMenuProps) => {
  if (!editor) {
    return null
  }
  return (
    <BubbleMenu
      className='bg-white rounded-xl shadow-md px-3 py-1 border'
      editor={editor}
      tippyOptions={{
        duration: 100,
        placement: 'top',
      }}
    >
      <div className="flex flex-row gap-2 items-center">
        <EditorMenuButton
          handleClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive('bold')}
          editor={editor}
        >
          <Bold className="w-4 h-4 flex-shrink-0" strokeWidth={1.75} />
        </EditorMenuButton>
        <EditorMenuButton
          handleClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive('italic')}
          editor={editor}
        >
          <Italic className="w-4 h-4 flex-shrink-0" strokeWidth={1.75} />
        </EditorMenuButton>
        <EditorMenuButton
          handleClick={() => editor.chain().focus().toggleUnderline().run()}
          isActive={editor.isActive('underline')}
          editor={editor}
        >
          <Underline className="w-4 h-4 flex-shrink-0" strokeWidth={1.75} />
        </EditorMenuButton>
        <EditorMenuButton
          handleClick={() => editor.chain().focus().toggleStrike().run()}
          isActive={editor.isActive('strike')}
          editor={editor}
        >
          <Strikethrough className="w-4 h-4 flex-shrink-0" strokeWidth={1.75} />
        </EditorMenuButton>
        <Separator orientation='vertical' />
        <EditorMenuButton
          handleClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive('bulletList')}
          editor={editor}
        >
          <List className="w-4 h-4 flex-shrink-0" strokeWidth={1.75} />
        </EditorMenuButton>
        <EditorMenuButton
          handleClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive('orderedList')}
          editor={editor}
        >
          <ListOrdered className="w-4 h-4 flex-shrink-0" strokeWidth={1.75} />
        </EditorMenuButton>
        <Separator orientation='vertical' />
        <EditorMenuButton
          handleClick={() => editor.chain().focus().setCode().run()}
          isActive={editor.isActive('code')}
          editor={editor}
        >
          <Code className="w-4 h-4 flex-shrink-0" strokeWidth={1.75} />
        </EditorMenuButton>
        <EditorMenuButton
          handleClick={() => editor.chain().focus().setCodeBlock().run()}
          isActive={editor.isActive('codeBlock')}
          editor={editor}
        >
          <Terminal className="w-4 h-4 flex-shrink-0" strokeWidth={1.75} />
        </EditorMenuButton>
      </div>
    </BubbleMenu>
  )
}