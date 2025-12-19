import type { Chat } from "../types/chat"
import camelcaseKeys from "camelcase-keys"
import { useQuery } from "@tanstack/react-query"
import { apiFetch } from "@/api"


interface ListChatsResponse {
  data: {
    chats: Array<{
      id: number,
      uid: string,
      label?: string,
      user_uid?: string,
      graph_uid?: string,
      created_at?: string,
      updated_at?: string,
      deleted_at?: string
    }>
  }
}


/**
 * Fetch the list of chats.
 */
export async function listChats(
  offset: number = 0,
  limit: number = 100,
  graphUid: string | null = null
): Promise<Chat[]> {
  console.log("Fetching chats with", { offset, limit, graphUid })
  const res = await apiFetch<ListChatsResponse>({
    path: `/chats`,
    method: "GET",
    params: { offset, limit, graph_uid: graphUid },
  })
  return res.data.chats.map((chat) => camelcaseKeys(chat, { deep: true })) as Chat[]
}


/**
 * Custom hook to fetch the list of chats for a user.
 *
 * @param userId - The ID of the user whose chats are to be fetched.
 *
 * @returns A query object containing the list of chats.
 */
export const useListChats = ({
  offset = 0,
  limit = 100,
  graphUid = null
}: {
  offset?: number,
  limit?: number,
  graphUid?: string | null
}) => {
  return useQuery<Chat[]>({
    queryKey: ["listChats", offset, limit, graphUid],
    queryFn: () => listChats(offset, limit, graphUid),
    enabled: offset >= 0 && limit > 0,
    staleTime: 1000 * 60 * 5 // 5 minutes
  })
}