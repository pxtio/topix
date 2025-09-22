import { useMutation, useQueryClient } from "@tanstack/react-query"
import { type Chat } from "../types/chat"
import { apiFetch } from "@/api"


/**
 * Create a new chat for the user.
 *
 * @param userId - The ID of the user for whom the chat is being created.
 */
export async function createNewChat({
  userId,
  boardId,
}: {
  userId: string,
  boardId?: string,
}): Promise<string> {
  const res = await apiFetch<{ data: { chat_id: string } }>({
    path: "/chats",
    method: "PUT",
    params: { user_id: userId, board_id: boardId },
  })
  return res.data.chat_id
}


// Simple hook for creating a new chat
export const useCreateChat = () => {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: createNewChat,
    onSuccess: (chatId, { userId, boardId }) => {
      queryClient.setQueryData<Chat[]>(["listChats", userId], (oldData) => {
        const newChat = {
          id: -1,
          uid: chatId,
          label: undefined,
          createdAt: new Date().toISOString(),
          userId,
          graphUid: boardId
        } as Chat
        return [newChat, ...(oldData || [])]
      })
    }
  })
  return {
    createChat: mutation.mutate,
    createChatAsync: mutation.mutateAsync,
    ...mutation
  }
}