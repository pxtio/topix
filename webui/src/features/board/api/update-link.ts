import { API_URL } from "@/config/api"
import snakecaseKeys from "snakecase-keys"
import type { Link } from "../types/link"
import { useMutation } from "@tanstack/react-query"


/**
 * Update a link on a board for the user.
 *
 * @param boardId - The ID of the board containing the link.
 * @param userId - The ID of the user who owns the board.
 * @param linkId - The ID of the link to be updated.
 * @param linkData - The updated link data.
 * @returns A promise that resolves when the link has been successfully updated.
 */
export async function updateLink(
  boardId: string,
  userId: string,
  linkId: string,
  linkData: Partial<Link>
): Promise<void> {
  const headers = new Headers()
  headers.set("Content-Type", "application/json")

  const response = await fetch(`${API_URL}/boards/${boardId}/links/${linkId}?user_id=${userId}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ data: snakecaseKeys(linkData, { deep: true }) })
  })

  if (!response.ok) {
    throw new Error(`Failed to update link: ${response.statusText}`)
  }
}


export const useUpdateLink = () => {
  const mutation = useMutation({
    mutationFn: async ({
      boardId,
      userId,
      linkId,
      linkData
    }: {
      boardId: string
      userId: string
      linkId: string
      linkData: Partial<Link>
    }) => {
      await updateLink(boardId, userId, linkId, linkData)
    }
  })

  return { updateLink: mutation.mutate, ...mutation }
}