import { API_URL } from "@/config/api"
import type { Link } from "../types/link"
import { useMutation } from "@tanstack/react-query"
import snakecaseKeys from "snakecase-keys"
import { DEBOUNCE_DELAY } from "../const"
import { sleep } from "@/lib/common"


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
      await sleep(DEBOUNCE_DELAY)
      await addLinks(boardId, userId, links)
    }
  })

  return { addLinks: mutation.mutate, ...mutation }
}