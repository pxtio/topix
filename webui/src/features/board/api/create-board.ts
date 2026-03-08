import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useGraphStore } from "../store/graph-store"
import type { Graph } from "../types/board"
import { apiFetch } from "@/api"
import { useAppStore } from "@/store"
import { listBoards } from "./list-boards"
import { isBoardCreationLimited } from "../lib/board-limit"
import { toast } from "sonner"


/**
 * Create a new board for the user.
 */
export async function createBoard(): Promise<string> {
  const res = await apiFetch<{ data: { graph_id: string } }>({
    path: "/boards",
    method: "PUT"
  })
  return res.data.graph_id
}


/**
 * Custom hook to create a new board for the user.
 *
 * @returns An object containing the createBoard function and its mutation state.
 */
export const useCreateBoard = () => {
  const queryClient = useQueryClient()
  const userPlan = useAppStore(s => s.userPlan)

  const { setGraphScope, setNodes, setEdges } = useGraphStore()

  const mutation = useMutation({
    mutationFn: async () => {
      const cachedBoards = queryClient.getQueryData<Graph[]>(["listBoards"])
      const boards = cachedBoards ?? await listBoards()

      if (isBoardCreationLimited(userPlan, boards.length)) {
        toast.error("Free plan allows 1 board. Upgrade to Plus for unlimited limits, or self-host for your own unlimited setup.")
        throw new Error("board_limit_reached")
      }

      const boardId = await createBoard()
      queryClient.setQueryData(["listBoards"], (oldBoards: Graph[] | undefined) => {
        const newBoard = { uid: boardId } as Graph // Temporary ID until the server responds
        return [newBoard, ...(oldBoards || [])] // Prepend the new board to the list
      })
      setGraphScope({ boardId, rootId: undefined }) // Set the current board scope to the newly created board
      setNodes([])
      setEdges([])
      return boardId
    }
  })

  return {
    createBoard: mutation.mutate,
    createBoardAsync: mutation.mutateAsync,
    ...mutation
  }
}
