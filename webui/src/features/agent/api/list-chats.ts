import { API_URL } from "@/config/api";
import type { Chat } from "../types/chat";
import camelcaseKeys from "camelcase-keys";
import { useQuery } from "@tanstack/react-query";


/**
 * Fetch the list of chats.
 */
export async function listChats(
    userId: string
): Promise<Chat[]> {
    const headers = new Headers();
    headers.set("Content-Type", "application/json");
    const response = await fetch(`${API_URL}/chats?user_id=${userId}`, {
        method: "GET",
        headers
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch chats: ${response.statusText}`)
    }

    const data = await response.json();
    return data.data.chats.map((chat: {
        id: number,
        uid: string,
        label?: string,
        user_uid?: string,
        graph_uid?: string,
        created_at?: string,
        updated_at?: string,
        deleted_at?: string
    }) => camelcaseKeys(chat, { deep: true })) as Chat[]
}


/**
 * Custom hook to fetch the list of chats for a user.
 *
 * @param userId - The ID of the user whose chats are to be fetched.
 *
 * @returns A query object containing the list of chats.
 */
export const useListChats = ({
    userId
}: {
    userId: string
}) => {
    return useQuery<Chat[]>({
        queryKey: ["listChats", userId],
        queryFn: () => listChats(userId),
        enabled: !!userId,
        staleTime: 1000 * 60 * 5 // 5 minutes
    })
}