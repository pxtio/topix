import { Layout } from './components/layout'
import { Toaster } from './components/ui/sonner'
import { ChatView } from './features/agent/components/chat-view'
import { GraphView } from './features/board/components/graph-view'
import { useAppStore } from './store'

function App() {
  const view = useAppStore((state) => state.view)

  return (
    <Layout>
      { view == "chat" ? <ChatView />: <GraphView /> }
      <Toaster position='top-center' />
    </Layout>
  )
}

export default App
