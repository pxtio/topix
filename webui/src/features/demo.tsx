import { useParams } from '@tanstack/react-router'

/** Renders when visiting /chats (new chat page) */
export function NewChat() {
  return (
    <div className="p-4">
      <h1 className="text-xl font-bold">🆕 New Chat</h1>
      <p>This is the new chat screen. Click send to create a chat.</p>
    </div>
  )
}

/** Renders when visiting /chats/:id */
export function ChatView() {
  const { id } = useParams({ from: '/chats/$id' })
  return (
    <div className="p-4">
      <h1 className="text-xl font-bold">💬 Chat {id}</h1>
      <p>Mocked conversation content for chat {id}.</p>
    </div>
  )
}

/** Renders when visiting /boards/:id/* */
export function BoardView() {
  const { id } = useParams({ from: '/boards/$id' })
  return (
    <div className="p-4">
      <h1 className="text-xl font-bold">📋 Board {id}</h1>
      <p>Mocked board content for board {id}.</p>
    </div>
  )
}
