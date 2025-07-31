import { API_URL } from "@/config/api"
import { useQuery } from "@tanstack/react-query"


/**
 * List all boards for the user.
 *
 * @param userId - The ID of the user whose boards are being listed.
 * @returns A promise that resolves to an array of board objects, each containing an id and label.
 */
export async function listBoards(
  userId: string
): Promise<{ id: string, label?: string }[]> {
  const headers = new Headers()
  headers.set("Content-Type", "application/json")

  const response = await fetch(`${API_URL}/boards?user_id=${userId}`, {
    method: "GET",
    headers
  })

  if (!response.ok) {
    throw new Error(`Failed to list boards: ${response.statusText}`)
  }

  const data = await response.json()
  return data.data.graphs
}


/**
 * Custom hook to fetch the list of boards for a user.
 *
 * @param userId - The ID of the user whose boards are to be fetched.
 *
 * @returns A query object containing the list of boards.
 */
export const useListBoards = ({
  userId
}: {
  userId: string
}) => {
  return useQuery<{ id: string, label?: string }[]>({
    queryKey: ["listBoards", userId],
    queryFn: () => listBoards(userId),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5 // 5 minutes
  })
}