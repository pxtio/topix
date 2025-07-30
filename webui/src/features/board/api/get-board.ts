import { API_URL } from "@/config/api"
import type { Graph } from "../types/board"
import camelcaseKeys from "camelcase-keys"
import { useQuery } from "@tanstack/react-query"


/**
 * Fetch a board by its ID for the user.
 *
 * @param boardId - The ID of the board to be fetched.
 * @param userId - The ID of the user who owns the board.
 * @returns A promise that resolves to the board object.
 */
export async function getBoard(
  boardId: string,
  userId: string
): Promise<Graph> {
  const headers = new Headers()
  headers.set("Content-Type", "application/json")

  const response = await fetch(`${API_URL}/boards/${boardId}?user_id=${userId}`, {
    method: "GET",
    headers
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch board: ${response.statusText}`)
  }

  const data = await response.json()
  return camelcaseKeys(data.data.graph)
}


/**
 * Custom hook to fetch a board by its ID for the user.
 *
 * @param boardId - The ID of the board to be fetched.
 * @param userId - The ID of the user who owns the board.
 *
 * @returns A query object containing the board data.
 */
export const useGetBoard = ({
  boardId,
  userId
}: {
  boardId: string
  userId: string
}) => {
  return useQuery<Graph>({
    queryKey: ["getBoard", boardId, userId],
    queryFn: () => getBoard(boardId, userId),
    enabled: !!boardId && !!userId,
    staleTime: 1000 * 60 * 5 // 5 minutes
  })
}