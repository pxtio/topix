import { useCallback, useMemo, useRef } from "react"
import hljs from "highlight.js/lib/core"
import html from "highlight.js/lib/languages/xml"
import javascript from "highlight.js/lib/languages/javascript"
import python from "highlight.js/lib/languages/python"
import typescript from "highlight.js/lib/languages/typescript"


hljs.registerLanguage("python", python)
hljs.registerLanguage("html", html)
hljs.registerLanguage("javascript", javascript)
hljs.registerLanguage("typescript", typescript)


export type CodeAreaLanguage = "python" | "html" | "javascript" | "typescript"


type CodeAreaProps = {
  value: string
  isDark: boolean
  textColor: string
  onChange: (value: string) => void
  language?: CodeAreaLanguage
  placeholder?: string
}


const TAB = "  "


const highlightCode = (code: string, language: CodeAreaLanguage) =>
  hljs.highlight(code || " ", { language }).value


const getLineIndentation = (text: string) => {
  const match = text.match(/^[\t ]*/)
  return match?.[0] ?? ""
}


/**
 * Lightweight code editor with highlighted preview and custom tab indentation.
 */
export function CodeArea({
  value,
  isDark,
  textColor,
  onChange,
  language = "python",
  placeholder = "# Write Python here",
}: CodeAreaProps) {
  const highlightedEditorRef = useRef<HTMLPreElement | null>(null)

  const editorHtml = useMemo(() => highlightCode(value, language), [language, value])

  /**
   * Insert indentation and preserve current line indentation for new lines.
   */
  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = event.currentTarget
    const start = textarea.selectionStart ?? 0
    const end = textarea.selectionEnd ?? start

    if (event.key === "Tab") {
      event.preventDefault()
      event.stopPropagation()
      textarea.setRangeText(TAB, start, end, "end")
      const nativeEvent = new Event("input", { bubbles: true })
      textarea.dispatchEvent(nativeEvent)
      return
    }

    if (event.key !== "Enter") return

    event.preventDefault()
    event.stopPropagation()

    const beforeCursor = textarea.value.slice(0, start)
    const currentLine = beforeCursor.slice(beforeCursor.lastIndexOf("\n") + 1)
    const indentation = getLineIndentation(currentLine)
    const trimmedLine = currentLine.trimEnd()
    const extraIndent = language === "python"
      ? (trimmedLine.endsWith(":") ? TAB : "")
      : language === "javascript" || language === "typescript"
        ? (trimmedLine.endsWith("{") ? TAB : "")
        : ""

    textarea.setRangeText(`\n${indentation}${extraIndent}`, start, end, "end")
    const nativeEvent = new Event("input", { bubbles: true })
    textarea.dispatchEvent(nativeEvent)
  }, [language])

  /**
   * Keep the hidden highlighted layer aligned with the textarea viewport.
   */
  const handleScroll = useCallback((event: React.UIEvent<HTMLTextAreaElement>) => {
    if (!highlightedEditorRef.current) return
    highlightedEditorRef.current.scrollTop = event.currentTarget.scrollTop
    highlightedEditorRef.current.scrollLeft = event.currentTarget.scrollLeft
  }, [])

  return (
    <div
      className={`code-sandbox-theme relative h-full ${isDark ? "code-sandbox-theme-dark" : "code-sandbox-theme-light"}`}
      onPointerDown={(event) => event.stopPropagation()}
      onDoubleClick={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
    >
      <pre
        ref={highlightedEditorRef}
        aria-hidden="true"
        className="hljs absolute inset-0 overflow-auto scrollbar-thin p-4 text-sm leading-6 font-mono whitespace-pre-wrap break-words pointer-events-none bg-transparent"
        dangerouslySetInnerHTML={{ __html: `${editorHtml}\n` }}
      />
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
        onScroll={handleScroll}
        spellCheck={false}
        className="absolute inset-0 w-full h-full resize-none border-0 bg-transparent p-4 outline-none scrollbar-thin font-mono text-sm leading-6 text-transparent caret-current selection:bg-primary/20"
        style={{
          caretColor: textColor,
        }}
        placeholder={placeholder}
      />
    </div>
  )
}
