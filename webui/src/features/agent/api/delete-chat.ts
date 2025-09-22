import { useMutation, useQueryClient } from "@tanstack/react-query"
import { type Chat } from "../types/chat"
import { apiFetch } from "@/api"


export async function deleteChat(chatId: string, userId: string): Promise<void> {
  await apiFetch({
    path: `/chats/${chatId}`,
    method: "DELETE",
    params: { user_id: userId },
  })
  return
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