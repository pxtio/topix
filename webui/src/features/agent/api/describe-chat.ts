import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiFetch } from "@/api"
import { updateCachedChatEverywhere } from "./update-chat"


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
    onSuccess: (label, variables) => {
      updateCachedChatEverywhere({
        queryClient,
        chatId: variables.chatId,
        patch: { label }
      })
    }
  })

  return {
    describeChat: mutation.mutate,
    describeChatAsync: mutation.mutateAsync,
    ...mutation
  }
}
