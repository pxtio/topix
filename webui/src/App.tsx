import { Layout } from './components/layout'
import { ChatView } from './features/agent/components/chat-view'
import { GraphView } from './features/board/components/graph-view'
import { useAppStore } from './store'

function App() {
  const view = useAppStore((state) => state.view)

  return (
    <Layout>
      { view == "chat" ? <ChatView />: <GraphView /> }
    </Layout>
  )
}

export default App
