import { API_URL } from "@/config/api"


/**
 * Create a new board for the user.
 *
 * @param userId - The ID of the user for whom the board is being created.
 */
export async function createBoard(
  userId: string
): Promise<string> {
  const headers = new Headers()
  headers.set("Content-Type", "application/json")

  const response = await fetch(`${API_URL}/boards?user_id=${userId}`, {
    method: "PUT",
    headers
  })

  if (!response.ok) {
    throw new Error(`Failed to create board: ${response.statusText}`)
  }

  const data = await response.json()
  return data.data.graph_id
}