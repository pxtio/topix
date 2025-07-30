import { API_URL } from "@/config/api"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { type Chat } from "../types/chat"


export async function deleteChat(chatId: string, userId: string): Promise<void> {
  const headers = new Headers()
  headers.set("Content-Type", "application/json")

  const response = await fetch(`${API_URL}/chats/${chatId}?user_id=${userId}`, {
    method: "DELETE",
    headers
  })

  if (!response.ok) {
    throw new Error(`Failed to delete chat: ${response.statusText}`)
  }
}


export const useDeleteChat = () => {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: async ({ chatId, userId }: { chatId: string, userId: string }) => {
      await deleteChat(chatId, userId)
      queryClient.setQueryData<Chat[]>(["listChats", userId], (oldData) => {
        if (!oldData) {
          return []
        }
        return oldData.filter((chat) => chat.uid !== chatId)
      })
      return chatId
    }
  })

  return {
    deleteChat: mutation.mutate,
    ...mutation
  }
}