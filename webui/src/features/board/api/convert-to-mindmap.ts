import { API_URL } from "@/config/api"
import type { Link } from "../types/link"
import type { Note } from "../types/note"
import camelcaseKeys from "camelcase-keys"
import { useMutation } from "@tanstack/react-query"
import { useAppStore } from "@/store"
import { convertLinkToEdge, convertNoteToNode } from "../utils/graph"
import { autoLayout } from "../lib/graph/auto-layout"
import { defaultLayoutOptions } from "../lib/graph/settings"
import { useMindMapStore } from "@/features/agent/store/mindmap-store"
import { createDefaultStyle } from "../types/style"


/**
 * Convert a text answer to a mind map format.
 */
export async function convertToMindMap(
  userId: string,
  answer: string
): Promise<{ notes: Note[], links: Link[] }> {
  const headers = new Headers()
  headers.set("Content-Type", "application/json")

  const response = await fetch(`${API_URL}/tools/mindmaps:convert?user_id=${userId}`, {
    method: "POST",
    headers,
    body: JSON.stringify({ answer })
  })

  if (!response.ok) {
    throw new Error(`Failed to convert to mind map: ${response.statusText}`)
  }

  const data = await response.json()
  return camelcaseKeys(data.data, { deep: true }) as { notes: Note[], links: Link[] }
}


/**
 * Hook to convert a text answer to a mind map and store it in the mind map store.
 */
export const useConvertToMindMap = () => {
  const { userId } = useAppStore()

  const {
    setMindMap,
    isProcessing,
    setIsProcessing,
    setInProcessingBoardId
  } = useMindMapStore()

  const mutation = useMutation({
    mutationFn: async ({
      boardId,
      answer
    }: { boardId: string, answer: string }): Promise<{ status: string }> => {
      if (isProcessing) {
        return { status: "processing" }
      }
      setIsProcessing(true)
      setInProcessingBoardId(boardId)
      const { notes, links } = await convertToMindMap(userId, answer)

      notes.forEach(note => {
        note.graphUid = boardId
        note.style = createDefaultStyle({})
      })
      links.forEach(link => link.graphUid = boardId)
      const rawNodes = notes.map(convertNoteToNode)
      const rawEdges = links.map(convertLinkToEdge)

      const { nodes, edges } = await autoLayout(rawNodes, rawEdges, defaultLayoutOptions)

      // store temporarily in mind map store
      // will be consumed by board component
      // and then cleared
      setMindMap(boardId, nodes, edges)
      setIsProcessing(false)
      setInProcessingBoardId(undefined)

      return { status: "success" }
    }
  })

  return {
    convertToMindMap: mutation.mutate,
    ...mutation
  }
}