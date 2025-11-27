import snakecaseKeys from "snakecase-keys"
import type { Link } from "../types/link"
import { useMutation } from "@tanstack/react-query"
import { apiFetch } from "@/api"


/**
 * Update a link on a board for the user.
 *
 * @param boardId - The ID of the board containing the link.
 * @param linkId - The ID of the link to be updated.
 * @param linkData - The updated link data.
 * @returns A promise that resolves when the link has been successfully updated.
 */
export async function updateLink(
  boardId: string,
  linkId: string,
  linkData: Partial<Link>
): Promise<void> {
  await apiFetch({
    path: `/boards/${boardId}/links/${linkId}`,
    method: "PATCH",
    body: { data: snakecaseKeys(linkData, { deep: true }) }
  })
}


export const useUpdateLink = () => {
  const mutation = useMutation({
    mutationFn: async ({
      boardId,
      linkId,
      linkData
    }: {
      boardId: string
      linkId: string
      linkData: Partial<Link>
    }) => {
      await updateLink(boardId, linkId, linkData)
    }
  })

  return { updateLink: mutation.mutate, ...mutation }
}