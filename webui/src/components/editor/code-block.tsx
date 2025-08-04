import React, { useCallback } from 'react'
import { NodeViewWrapper, NodeViewContent } from '@tiptap/react'
import { Clipboard } from 'lucide-react'
import { Node as ProseMirrorNode } from 'prosemirror-model'
import { toast } from 'sonner'


interface CodeBlockComponentProps {
  node: ProseMirrorNode
}


/**
 * Custom Tiptap NodeView for rendering code blocks with a copy-to-clipboard feature.
 */
export const CodeBlockComponent: React.FC<CodeBlockComponentProps> = ({ node }) => {
  const handleCopy = useCallback(() => {
    const code = node.textContent
    navigator.clipboard.writeText(code).then(() => {
      console.log('Text copied to clipboard: ', code)
      toast('Text copied to clipboard!')
    }).catch(err => {
      console.error('Failed to copy text: ', err)
    })
  }, [node])

  // Access the language attribute here
  const language = node.attrs.language || 'plaintext'

  return (
    <NodeViewWrapper className="code-block">
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => handleCopy()}
          className="transition-all absolute top-1 right-1 text-sm bg-transparent hover:bg-accent p-2 rounded-xl text-accent-foreground z-10"
          aria-label="Copy to clipboard"
        >
          <Clipboard strokeWidth={1.75} className='h-4 w-4' />
        </button>
        <span className="absolute top-0 left-0 w-auto bg-transparent text-[11px] px-4 py-2 text-accent-foreground text-sm z-10">
          {language}
        </span>
        <pre>
          <NodeViewContent as="code" className='pt-6' />
        </pre>
      </div>
    </NodeViewWrapper>
  )
}