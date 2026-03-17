import hljs from "highlight.js/lib/core"
import python from "highlight.js/lib/languages/python"

import type { CodeExecutionResult } from "../../api/execute-code-note"


hljs.registerLanguage("python", python)


export const ROSE_PINE_DARK = {
  bg: "#191724",
  panel: "#1f1d2e",
  text: "#e0def4",
  muted: "#908caa",
  accent: "#9ccfd8",
  danger: "#eb6f92",
}

export const ROSE_PINE_LIGHT = {
  bg: "#faf4ed",
  panel: "#fffaf3",
  text: "#575279",
  muted: "#797593",
  accent: "#286983",
  danger: "#b4637a",
}

export const EMPTY_CODE_EXECUTION_RESULT: CodeExecutionResult = {
  status: "success",
  stdout: "",
  stderr: "",
  durationMs: 0,
}


/**
 * Highlight Python code for board previews and the dialog editor.
 */
export function highlightPython(code: string) {
  return hljs.highlight(code || " ", { language: "python" }).value
}


/**
 * Normalize code while preserving user-authored line content.
 */
export function normalizeCode(code: string) {
  return code.replace(/\n+$/g, "")
}
