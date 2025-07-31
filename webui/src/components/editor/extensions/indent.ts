import { Extension } from "@tiptap/core"

const TAB_CHAR = "\t"
const TAB_CHAR_REPLACEMENT = "  " // Two spaces for indentation


/**
 * IndentHandler extension for handling tab and shift-tab key events in the editor.
 * - Inserts a tab character in code blocks.
 * - Sinks list items when pressing Tab at the start of a list item.
 * - Outdents code blocks and lifts list items when pressing Shift-Tab.
 */
export const IndentHandler = Extension.create({
  name: "indentHandler",
  addKeyboardShortcuts() {
    return {
      // Handle Enter key to insert a new line with the same indentation in code blocks
      Enter: ({ editor }) => {
        if (editor.isActive('codeBlock')) {
          const { state } = editor
          const { $from } = state.selection
          const codeText = $from.parent.textContent
          const posInCode = $from.parentOffset

          // Find start of current line
          const prevBreak = codeText.lastIndexOf('\n', posInCode - 1)
          const lineStart = prevBreak + 1
          // Extract leading spaces/tabs
          const line = codeText.slice(lineStart, posInCode)
          const match = line.match(/^[ \t]*/)
          const indent = match ? match[0] : ''

          // Insert new line + the indent
          editor
            .chain()
            .command(({ tr }) => {
              const newLine = '\n' + indent
              tr.insertText(newLine, $from.pos)
              return true
            })
            .run()

          return true
        }
        return false
      },
      // Handle Tab and Shift-Tab for indentation
      Tab: ({ editor }) => {
        if (editor.isActive("codeBlock")) {
          // If we're in a code block, insert a tab character
          editor
            .chain()
            .command(({ tr }) => {
              tr.insertText(TAB_CHAR_REPLACEMENT)
              return true
            })
            .run()
          return true
        }

        // Check if we're at the start of a list item
        if (editor.isActive("listItem")) {
          // Attempt to sink the list item
          return editor.chain().sinkListItem("listItem").run()
        }

        // Prevent default behavior (losing focus)
        return true
      },
      "Shift-Tab": ({ editor }) => {
        const { selection, doc } = editor.state
        const { $from } = selection
        const pos = $from.pos

        // 1. Outdent code block
        if (editor.isActive("codeBlock")) {
          // Find the text block (code block)
          const node = $from.parent // This is the code block's text node

          // Find the position of the code block node in the document
          const codeBlockPos = $from.start()

          // The cursor position within the code block's text
          const cursorInCode = $from.pos - codeBlockPos

          const codeText = node.textContent

          // Find the start of the current line (last \n before the cursor or 0)
          const lastLineBreak = codeText.lastIndexOf('\n', cursorInCode - 1)
          const lineStart = lastLineBreak + 1 // 0 if no line break found
          // Check if there are 2 spaces or a tab at the start of the line
          if (codeText.startsWith(TAB_CHAR_REPLACEMENT, lineStart)) {
            // Remove 2 spaces at the start of the line
            editor
              .chain()
              .command(({ tr }) => {
                tr.delete(codeBlockPos + lineStart, codeBlockPos + lineStart + 2)
                return true
              })
              .run()
            return true
          } else if (codeText.startsWith('\t', lineStart)) {
            // Remove tab at the start of the line
            editor
              .chain()
              .command(({ tr }) => {
                tr.delete(codeBlockPos + lineStart, codeBlockPos + lineStart + 1)
                return true
              })
              .run()
            return true
          }
          // If no indent, do nothing
          return true
        }

        // Check if we're at the start of a list item
        if (editor.isActive("listItem")) {
          // If so, lift the list item
          return editor.chain().liftListItem("listItem").run()
        }

        // Check if the previous character is a tab
        if (doc.textBetween(pos - 1, pos) === TAB_CHAR) {
          // If so, delete it
          editor
            .chain()
            .command(({ tr }) => {
              tr.delete(pos - 1, pos)
              return true
            })
            .run()
          return true
        }

        // Prevent default behavior (losing focus)
        return true
      },
    }
  },
})