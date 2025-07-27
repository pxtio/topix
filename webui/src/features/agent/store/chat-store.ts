import { create } from "zustand"
import type { AgentResponse } from "../types/stream"


/**
 * Store for managing chat streams.
 *
 * @property streams - A map of chat IDs to their respective stream messages.
 * @property addStream - Function to add a message to a chat's stream.
 * @property clearStream - Function to clear the stream for a specific chat.
 */
export interface ChatStore {
    streams: Map<string, AgentResponse>
    setStream: (responseId: string, response: AgentResponse) => void
    clearStream: (responseId: string) => void
}


/**
 * Create a Zustand store for managing chat streams.
 *
 * @returns A Zustand store with methods to add and clear chat streams.
 */
export const useChatStore = create<ChatStore>((set) => ({
    streams: new Map(),
    setStream: (responseId, response) => set((state) => {
        return { streams: new Map(state.streams).set(responseId, response) }
    }),
    clearStream: (responseId) => set((state) => {
        const streams = new Map(state.streams)
        streams.delete(responseId)
        return { streams }
    })
}))