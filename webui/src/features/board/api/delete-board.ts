import { API_URL } from "@/config/api";


/**
 * Delete a board for the user.
 *
 * @param boardId - The ID of the board to be deleted.
 * @param userId - The ID of the user who owns the board.
 */
export function deleteBoard(
  boardId: string,
  userId: string
): Promise<void> {
  const headers = new Headers();
  headers.set("Content-Type", "application/json");

  return fetch(`${API_URL}/boards/${boardId}?user_id=${userId}`, {
    method: "DELETE",
    headers,
  }).then((response) => {
    if (!response.ok) {
      throw new Error(`Failed to delete board: ${response.statusText}`);
    }
  });
}