import { useMutation, useQueryClient, type InfiniteData, type QueryClient } from "@tanstack/react-query"
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

type ChatCollection = Chat[] | InfiniteData<Chat[]>

const removeFromArrayCollection = (collection: Chat[], chatId: string) => {
  const next = collection.filter((chat) => chat.uid !== chatId)
  return next.length === collection.length ? collection : next
}

const removeFromInfiniteCollection = (collection: InfiniteData<Chat[]>, chatId: string) => {
  let changed = false

  const pages = collection.pages.map((page) => {
    const nextPage = page.filter((chat) => chat.uid !== chatId)
    if (nextPage.length !== page.length) changed = true
    return nextPage
  })

  return changed ? { ...collection, pages } : collection
}

const removeCachedChatEverywhere = ({
  queryClient,
  chatId
}: {
  queryClient: QueryClient
  chatId: string
}) => {
  const cachedQueries = queryClient.getQueryCache().findAll({
    queryKey: ["listChats"],
    exact: false
  })

  cachedQueries.forEach(({ queryKey }) => {
    queryClient.setQueryData(queryKey, (oldData: ChatCollection | undefined) => {
      if (!oldData) return oldData

      if (Array.isArray(oldData)) {
        return removeFromArrayCollection(oldData, chatId)
      }

      if ("pages" in oldData && Array.isArray(oldData.pages)) {
        return removeFromInfiniteCollection(oldData, chatId)
      }

      return oldData
    })
  })
}


export const useDeleteChat = () => {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: async ({ chatId, userId }: { chatId: string, userId: string }) => {
      return deleteChat(chatId, userId)
    },
    onSuccess: (_, { chatId }) => {
      removeCachedChatEverywhere({ queryClient, chatId })
    },
  })

  return {
    deleteChat: mutation.mutate,
    ...mutation
  }
}
