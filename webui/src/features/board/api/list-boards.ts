import { useQuery } from "@tanstack/react-query"
import type { Graph } from "../types/board"
import camelcaseKeys from "camelcase-keys"
import { apiFetch } from "@/api"

interface ListBoardsResponse {
  data: {
    graphs: Array<{
      uid: string
      type: "graph"
      label?: string
      readonly: boolean
      thumbnail?: string
      created_at: string
      updated_at?: string
      deleted_at?: string
    }>
  }
}


/**
 * List all boards for the user.
 *
 * @returns A promise that resolves to an array of board objects, each containing an id and label.
 */
export async function listBoards(): Promise<Graph[]> {
  const res = await apiFetch<ListBoardsResponse>({
    path: "/boards",
    method: "GET"
  })
  return res.data.graphs.map((board) => camelcaseKeys(board, { deep: true })) as Graph[]
}


/**
 * Custom hook to fetch the list of boards for a user.
 *
 * @param userId - The ID of the user whose boards are to be fetched.
 *
 * @returns A query object containing the list of boards.
 */
export const useListBoards = () => {
  return useQuery<Graph[]>({
    queryKey: ["listBoards"],
    queryFn: () => listBoards(),
    staleTime: 1000 * 60 * 5 // 5 minutes
  })
}