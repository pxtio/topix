import type { NoteNode } from "../types/flow"

type NoteLike = {
  label?: { markdown?: string }
  content?: { markdown?: string }
  properties?: { summary?: { text?: string } }
}

const trimOrEmpty = (value?: string) => (value ?? "").trim()

const pickNodeText = (node: NoteNode) => {
  const data = node.data as NoteLike | undefined
  const label = trimOrEmpty(data?.label?.markdown)
  const content = trimOrEmpty(data?.content?.markdown)
  const summary = trimOrEmpty(data?.properties?.summary?.text)

  if (label && content && label !== content) {
    return `Title: ${label}\nContent: ${content}`
  }
  if (label) return label
  if (summary) return summary
  if (content) return content
  return ""
}

export const buildContextTextFromNodes = (nodes: NoteNode[]) => {
  const lines = nodes
    .filter((node) => (node.data as { kind?: string } | undefined)?.kind !== "point")
    .map((node) => pickNodeText(node))
    .filter((text) => text.length > 0)

  if (lines.length === 0) return ""
  return lines.map((line) => `node content: ${line}`).join("\n\n")
}
