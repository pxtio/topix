import { Crepe } from "@milkdown/crepe"
import { Milkdown, useEditor } from "@milkdown/react"

import "@milkdown/crepe/theme/common/style.css"
import "@milkdown/crepe/theme/frame.css"
import "./milkdown-theme.css"


/**
 * Props for the Markdown editor component.
 */
export interface MdEditorProps {
  markdown: string
  onSave: (markdown: string) => void
}


/**
 * Markdown editor component.
 */
export const MdEditor = ({ markdown, onSave }: MdEditorProps) => {
  useEditor((root) => {
    const crepe = new Crepe({
      root,
      defaultValue: markdown,
    })
    crepe.on((listener) => {
      listener.markdownUpdated((_, markdown) => {
        onSave(markdown)
      })
    })

    return crepe
  }, [])

  return <Milkdown />
}
