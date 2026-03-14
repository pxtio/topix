import { useMutation, useQueryClient } from "@tanstack/react-query"
import { type Chat } from "../types/chat"
import { apiFetch } from "@/api"
import { updateCachedChatEverywhere } from "./update-chat"


/**
 * Create a new chat for the user.
 *
 * @param userId - The ID of the user for whom the chat is being created.
 */
export async function createNewChat({
  userId,
  boardId,
  chatId
}: {
  userId: string,
  boardId?: string,
  chatId?: string
}): Promise<string> {
  const res = await apiFetch<{ data: { chat_id: string } }>({
    path: "/chats",
    method: "PUT",
    params: { user_id: userId, board_id: boardId, chat_id: chatId },
  })
  return res.data.chat_id
}


// Simple hook for creating a new chat
export const useCreateChat = () => {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: createNewChat,
    onSuccess: (newChatId, { userId, boardId, chatId }) => {
      const createdChat = {
        id: -1,
        uid: chatId || newChatId,
        label: undefined,
        createdAt: new Date().toISOString(),
        userId,
        graphUid: boardId
      } as Chat

      updateCachedChatEverywhere({
        queryClient,
        chatId: createdChat.uid,
        patch: createdChat,
      })
    }
  })
  return {
    createChat: mutation.mutate,
    createChatAsync: mutation.mutateAsync,
    ...mutation
  }
}
