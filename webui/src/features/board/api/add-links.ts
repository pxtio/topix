import { API_URL } from "@/config/api";
import type { Link } from "../types/link";
import type { Graph } from "../types/board";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import snakecaseKeys from "snakecase-keys";


/**
 * Add links to a board for the user.
 *
 * @param boardId - The ID of the board to which links are being added.
 * @param userId - The ID of the user who owns the board.
 * @param links - An array of links to be added to the board.
 *
 * @returns A promise that resolves when the links have been added.
 */
export async function addLinks(
  boardId: string,
  userId: string,
  links: Link[]
): Promise<void> {
  const headers = new Headers()
  headers.set("Content-Type", "application/json")

  const reformattedLinks = links.map(link => snakecaseKeys(
    link as unknown as Record<string, unknown>,
    { deep: true }
  ))

  const response = await fetch(`${API_URL}/boards/${boardId}/links?user_id=${userId}`, {
    method: "POST",
    headers,
    body: JSON.stringify({ links: reformattedLinks })
  })

  if (!response.ok) {
    throw new Error(`Failed to add links: ${response.statusText}`)
  }
}


/**
 * Custom hook to add links to a board.
 *
 * @returns An object containing the addLinks function and its mutation state.
 */
export const useAddLinks = () => {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: async ({
      boardId,
      userId,
      links
    }: {
      boardId: string
      userId: string
      links: Link[]
    }) => {
      // Optimistically update the board in the cache
      queryClient.setQueryData<Graph>(
        ["getBoard", boardId, userId],
        (oldData) => {
          if (!oldData) return

          return {
            ...oldData,
            links: [...(oldData.links || []), ...links]
          }
        }
      )

      await addLinks(boardId, userId, links)
      // Mark the links as saved in the cache
      links.forEach(link => {
        link.saved = true
      })
    }
  })

  return { addLinks: mutation.mutate, ...mutation }
}