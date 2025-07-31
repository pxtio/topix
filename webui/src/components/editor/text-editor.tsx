// components/TiptapMarkdownEditor.tsx
import React, { useEffect, useState } from 'react'
import { useEditor, EditorContent, ReactNodeViewRenderer } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Markdown } from 'tiptap-markdown'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import Typography from '@tiptap/extension-typography'
import History from '@tiptap/extension-history'
import Underline from '@tiptap/extension-underline'
import TaskItem from '@tiptap/extension-task-item'
import TaskList from '@tiptap/extension-task-list'
import Link from '@tiptap/extension-link'
import Table from '@tiptap/extension-table'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import TableRow from '@tiptap/extension-table-row'
import { all, createLowlight } from 'lowlight'
import 'katex/dist/katex.min.css'

import './styles.css'
import { EditorMenu } from './bubble-menu'
import { CodeBlockComponent } from './code-block'
import { IndentHandler } from './extensions/indent'


const lowlight = createLowlight(all)
const CodeBlock = CodeBlockLowlight.extend({
  addNodeView() {
    return ReactNodeViewRenderer(CodeBlockComponent)
  }
}).configure({
  lowlight
})


/**
 * TiptapMarkdownEditorProps defines the properties for the TiptapMarkdownEditor component.
 *
 * @property {string} markdown - The initial Markdown content to be displayed in the editor.
 * @property {function} [onChange] - Optional callback function that is called when the Markdown content changes.
 * @property {boolean} [readonly=false] - If true, the editor will be in read-only mode, preventing any edits.
 */
interface MarkdownEditorProps {
  markdown: string
  onChange?: (md: string) => void
  readonly?: boolean
}


/**
 * TiptapMarkdownEditor is a React component that provides a rich text editor
 * with Markdown support using Tiptap. It allows users to edit and format text,
 * including code blocks, mathematics, and tables. The editor can be configured
 * to be read-only or editable based on the `readonly` prop.
 */
export const MarkdownEditor: React.FC<MarkdownEditorProps> = ({ markdown, onChange, readonly = false }) => {
  const [initialMd, setInitialMd] = useState('')

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false,
        history: false
      }),
      Underline,
      Markdown,
      CodeBlock,
      Typography,
      History.configure({
        depth: 100,
        newGroupDelay: 500
      }),
      TaskItem.configure({
        nested: true
      }),
      TaskList,
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      Link.configure({
        openOnClick: false,
        autolink: true,
        linkOnPaste: true
      }),
      IndentHandler
    ],
    content: '',
    onUpdate: ({ editor }) => {
      const md = editor.storage.markdown.getMarkdown()
      onChange?.(md)
    },
    immediatelyRender: false,
    parseOptions: {
      preserveWhitespace: "full",
    },
    editable: !readonly
  })

  // Load initial markdown
  useEffect(() => {
    setInitialMd(markdown)
  }, [markdown])

  useEffect(() => {
    if (editor && initialMd) {
      editor.commands.setContent(
        initialMd,
        false
      )
    }
  }, [editor, initialMd])

  return (
    <>
      { !readonly && <EditorMenu editor={editor} /> }
      <EditorContent
        editor={editor}
        className="focus:outline-none"
      />
    </>
  )
}