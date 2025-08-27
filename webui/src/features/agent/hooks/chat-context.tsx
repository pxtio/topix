import { createContext, useContext, useEffect, useState, type ReactNode } from "react"

// shape of the context: chatId value + setter function
type ChatContextType = {
  chatId?: string
  setChatId: (id?: string) => void
}

// the actual context (starts undefined until provided)
const ChatContext = createContext<ChatContextType | undefined>(undefined)

// provider component: wraps children and stores chatId state
export const ChatProvider = ({
  initialChatId,
  children,
}: {
  initialChatId?: string
  children: ReactNode
}) => {
  const [chatId, setChatId] = useState<string | undefined>(initialChatId)

  useEffect(() => {
    setChatId(initialChatId)
  }, [initialChatId])

  return (
    <ChatContext.Provider value={{ chatId, setChatId }}>
      {children}
    </ChatContext.Provider>
  )
}

// custom hook to consume context safely inside components
// eslint-disable-next-line react-refresh/only-export-components
export const useChat = () => {
  const ctx = useContext(ChatContext)
  if (!ctx) throw new Error("useChat must be used within ChatProvider")
  return ctx
}
