import { useMutation, useQueryClient } from "@tanstack/react-query"
import { type Chat } from "../types/chat"
import { apiFetch } from "@/api"


/**
 * Describe a chat by its ID.
 */
export async function describeChat({
  chatId,
  userId
}: {
  chatId: string,
  userId: string
}): Promise<string> {
  const res = await apiFetch<{ data: { label: string } }>({
    path: `/chats/${chatId}:describe`,
    method: "POST",
    params: { user_id: userId },
  })
  return res.data.label
}


// simple hook for describing a chat
export const useDescribeChat = () => {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: describeChat,
    onSuccess: (data, variables) => {
      queryClient.setQueryData<Chat[]>(["listChats", variables.userId], (oldChats) => {
        if (!oldChats) return []
        return oldChats.map(chat =>
          chat.uid === variables.chatId
            ? { ...chat, label: data }
            : chat
        )
      })
    }
  })

  return {
    describeChat: mutation.mutate,
    describeChatAsync: mutation.mutateAsync,
    ...mutation
  }
}