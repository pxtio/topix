import type { Chat } from "../types/chat"
import snakecaseKeys from "snakecase-keys"
import {
  useMutation,
  useQueryClient,
  type InfiniteData,
  type QueryKey,
  type QueryClient,
} from "@tanstack/react-query"
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
  chatData: Partial<Chat>
): Promise<void> {
  await apiFetch({
    path: `/chats/${chatId}`,
    method: "PATCH",
    body: { data: snakecaseKeys(chatData, { deep: true }) }
  })
}


/**
 * Custom hook to update a chat.
 *
 * @returns An object containing the updateChat function and its mutation state.
 */
export type ChatCollection = Chat[] | InfiniteData<Chat[]>

export const normalizeGraphUid = (graphUid?: string | null) => graphUid ?? "none"

const getGraphFromQueryKey = (queryKey: QueryKey): string | undefined => {
  if (!Array.isArray(queryKey)) return undefined
  if (queryKey.length >= 4 && queryKey[1] === "infinite" && typeof queryKey[2] === "string") {
    return queryKey[2]
  }
  if (queryKey.length >= 4 && typeof queryKey[3] === "string") {
    return queryKey[3] as string
  }
  return undefined
}

const getPageSizeFromQueryKey = (queryKey: QueryKey): number | undefined => {
  if (Array.isArray(queryKey) && queryKey.length >= 4 && queryKey[1] === "infinite") {
    const maybeNumber = queryKey[3]
    return typeof maybeNumber === "number" ? maybeNumber : undefined
  }
  return undefined
}

const findChatInCollection = (collection: ChatCollection | undefined, chatId: string): Chat | undefined => {
  if (!collection) return undefined
  if (Array.isArray(collection)) {
    return collection.find(chat => chat.uid === chatId)
  }
  if ("pages" in collection && Array.isArray(collection.pages)) {
    for (const page of collection.pages) {
      const found = page.find(chat => chat.uid === chatId)
      if (found) return found
    }
  }
  return undefined
}

const updateArrayCollection = (
  collection: Chat[],
  queryGraph: string | undefined,
  targetGraph: string,
  updatedChat: Chat
) => {
  let found = false
  let changed = false

  const next = collection.reduce<Chat[]>((acc, chat) => {
    if (chat.uid !== updatedChat.uid) {
      acc.push(chat)
      return acc
    }

    found = true
    if (queryGraph && queryGraph !== targetGraph) {
      changed = true
      return acc
    }

    if (chat !== updatedChat) changed = true
    acc.push(updatedChat)
    return acc
  }, [])

  if (!found && (!queryGraph || queryGraph === targetGraph)) {
    next.unshift(updatedChat)
    changed = true
  }

  return changed ? next : collection
}

const updateInfiniteCollection = (
  collection: InfiniteData<Chat[]>,
  queryGraph: string | undefined,
  targetGraph: string,
  updatedChat: Chat,
  pageSize?: number
) => {
  let found = false
  let changed = false

  const nextPages = collection.pages.map((page) => {
    let localChanged = false
    const nextPage = page.reduce<Chat[]>((acc, chat) => {
      if (chat.uid !== updatedChat.uid) {
        acc.push(chat)
        return acc
      }

      found = true
      if (queryGraph && queryGraph !== targetGraph) {
        localChanged = true
        return acc
      }

      if (chat !== updatedChat) localChanged = true
      acc.push(updatedChat)
      return acc
    }, [])

    if (localChanged) changed = true
    return localChanged ? nextPage : page
  })

  if (!found && (!queryGraph || queryGraph === targetGraph)) {
    const pages = nextPages.length ? [...nextPages] : [[]]
    const firstPage = pages[0] ? [...pages[0]] : []
    firstPage.unshift(updatedChat)
    if (pageSize && firstPage.length > pageSize) {
      firstPage.length = pageSize
    }
    pages[0] = firstPage
    return { ...collection, pages }
  }

  return changed ? { ...collection, pages: nextPages } : collection
}

export const updateCachedChatEverywhere = ({
  queryClient,
  chatId,
  patch,
}: {
  queryClient: QueryClient
  chatId: string
  patch: Partial<Chat>
}) => {
  const cachedQueries = queryClient.getQueryCache().findAll({
    queryKey: ["listChats"],
    exact: false
  })

  let baseChat: Chat | undefined
  for (const { queryKey } of cachedQueries) {
    const data = queryClient.getQueryData(queryKey) as ChatCollection | undefined
    const found = findChatInCollection(data, chatId)
    if (found) {
      baseChat = found
      break
    }
  }

  const updatedChat: Chat = baseChat
    ? { ...baseChat, ...patch }
    : ({ uid: chatId, ...patch } as Chat)
  const targetGraph = normalizeGraphUid(updatedChat.graphUid)

  cachedQueries.forEach(({ queryKey }) => {
    const queryGraph = getGraphFromQueryKey(queryKey)
    const pageSize = getPageSizeFromQueryKey(queryKey)
    queryClient.setQueryData(queryKey, (oldData) =>
      updateCollectionForChat(
        oldData as ChatCollection | undefined,
        queryGraph,
        targetGraph,
        updatedChat,
        pageSize
      )
    )
  })
}

const updateCollectionForChat = (
  collection: ChatCollection | undefined,
  queryGraph: string | undefined,
  targetGraph: string,
  updatedChat: Chat,
  pageSize?: number
) => {
  if (!collection) return collection

  if (Array.isArray(collection)) {
    return updateArrayCollection(collection, queryGraph, targetGraph, updatedChat)
  }

  if ("pages" in collection && Array.isArray(collection.pages)) {
    return updateInfiniteCollection(collection, queryGraph, targetGraph, updatedChat, pageSize)
  }

  return collection
}

export const useUpdateChat = () => {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: async ({
      chatId,
      chatData
    }: {
      chatId: string
      chatData: Partial<Chat>
    }) => {
      updateCachedChatEverywhere({ queryClient, chatId, patch: chatData })
      await updateChat(chatId, chatData)
    }
  })

  return {
    updateChat: mutation.mutate,
    updateChatAsync: mutation.mutateAsync,
    ...mutation
  }
}
