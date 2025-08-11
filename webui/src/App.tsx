import { Layout } from './components/layout'
import { ThemeProvider } from './components/theme-provider'
import { Toaster } from './components/ui/sonner'
import { ChatView } from './features/agent/components/chat-view'
import { GraphView } from './features/board/components/graph-view'
import { useAppStore } from './store'

function App() {
  const view = useAppStore((state) => state.view)

  return (
    <ThemeProvider defaultTheme="dark">
      <Layout>
        { view == "chat" ? <ChatView />: <GraphView /> }
        <Toaster position='top-center' />
      </Layout>
    </ThemeProvider>
  )
}

export default App
