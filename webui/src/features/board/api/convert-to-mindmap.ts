import type { Link } from "../types/link"
import { createDefaultNote, type Note } from "../types/note"
import camelcaseKeys from "camelcase-keys"
import { useMutation } from "@tanstack/react-query"
import { useAppStore } from "@/store"
import { convertLinkToEdge, convertNoteToNode } from "../utils/graph"
import { autoLayout } from "../lib/graph/auto-layout"
import { defaultLayoutOptions } from "../lib/graph/settings"
import { useMindMapStore } from "@/features/agent/store/mindmap-store"
import { createDefaultLinkStyle, createDefaultStyle } from "../types/style"
import { colorTree } from "../utils/bfs"
import { pickRandomColorOfShade } from "../lib/colors/tailwind"
import { apiFetch } from "@/api"
import { escapeNonMathDollars } from "@/lib/common"


/**
 * Convert a text answer to a mind map format.
 */
export async function convertToMindMap(
  userId: string,
  answer: string,
  toolType: "notify" | "mapify"
): Promise<{ notes: Note[], links: Link[] }> {
  const res = await apiFetch<{ data: Record<string, unknown> }>({
    path: `/tools/mindmaps:${toolType}`,
    method: "POST",
    params: { user_id: userId },
    body: { answer }
  })

  return camelcaseKeys(res.data, { deep: true }) as { notes: Note[], links: Link[] }
}


/**
 * Hook to convert a text answer to a mind map and store it in the mind map store.
 */
export const useConvertToMindMap = () => {
  const { userId } = useAppStore()

  const setMindMap = useMindMapStore(state => state.setMindMap)

  const mutation = useMutation({
    mutationFn: async ({
      boardId,
      answer,
      toolType,
      saveAsIs = false
    }: { boardId: string, answer: string, toolType: "notify" | "mapify", saveAsIs?: boolean }): Promise<{ status: string }> => {
      // if saveAsIs and notify, just create a single note with the exact content
      if (saveAsIs && toolType === "notify") {
        const note = createDefaultNote({ boardId, nodeType: "sheet"})
        note.content = { markdown: escapeNonMathDollars(answer) }
        setMindMap(boardId, [convertNoteToNode(note)], [])
        return { status: "success" }
      }

      const { notes, links } = await convertToMindMap(userId, answer, toolType)
      notes.forEach(note => {
        if (note.content?.markdown) {
          note.content.markdown = escapeNonMathDollars(note.content.markdown)
        }
      })

      notes.forEach(note => {
        note.graphUid = boardId
        note.style = createDefaultStyle({ type: note.style.type })
      })
      links.forEach(link => {
        link.graphUid = boardId
        link.style = createDefaultLinkStyle()
      })
      if (toolType === "mapify") {
        // color tree if mapify
        colorTree({ notes, links })
      } else {
        if (notes.length > 0) {
          notes[0].style.backgroundColor = pickRandomColorOfShade(200, ['blue', 'amber', 'green', 'orange', 'rose'])?.hex || notes[0].style.backgroundColor
        }
      }
      const rawNodes = notes.map(convertNoteToNode)
      const rawEdges = links.map(convertLinkToEdge)

      const { nodes, edges } = await autoLayout(rawNodes, rawEdges, defaultLayoutOptions)

      // store temporarily in mind map store
      // will be consumed by board component
      // and then cleared
      setMindMap(boardId, nodes, edges)

      return { status: "success" }
    }
  })

  return {
    convertToMindMap: mutation.mutate,
    convertToMindMapAsync: mutation.mutateAsync,
    ...mutation
  }
}