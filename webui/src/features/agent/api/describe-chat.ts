import { API_URL } from "@/config/api"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { type Chat } from "../types/chat"


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
  const headers = new Headers()
  headers.set("Content-Type", "application/json")
  const response = await fetch(`${API_URL}/chats/${chatId}:describe?user_id=${userId}`, {
      method: "POST",
      headers
  })

  if (!response.ok) {
    throw new Error(`Failed to describe chat: ${response.statusText}`)
  }

  const data = await response.json()
  return data.data.label
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