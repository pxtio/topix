import type { Chat } from "../types/chat"
import snakecaseKeys from "snakecase-keys"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiFetch } from "@/api"


/**
 * Update a chat for the user.
 *
 * @param chatId - The ID of the chat to be updated.
 * @param userId - The ID of the user who owns the chat.
 * @param chatData - The updated chat data.
 * @returns A promise that resolves when the chat is successfully updated.
 */
export async function updateChat(
  chatId: string,
  userId: string,
  chatData: Partial<Chat>
): Promise<void> {
  await apiFetch({
    path: `/chats/${chatId}`,
    method: "PATCH",
    params: { user_id: userId },
    body: { data: snakecaseKeys(chatData, { deep: true }) }
  })
}


/**
 * Custom hook to update a chat.
 *
 * @returns An object containing the updateChat function and its mutation state.
 */
export const useUpdateChat = () => {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: async ({
      chatId,
      userId,
      chatData
    }: {
      chatId: string
      userId: string
      chatData: Partial<Chat>
    }) => {
      // Optimistically update the chat in the cache
      queryClient.setQueryData<Chat[]>(["listChats", userId], (oldChats) => {
        return oldChats?.map(chat =>
          chat.uid === chatId ? { ...chat, ...chatData } : chat
        )
      })

      await updateChat(chatId, userId, chatData)
    }
  })

  return {
    updateChat: mutation.mutate,
    updateChatAsync: mutation.mutateAsync,
    ...mutation
  }
}