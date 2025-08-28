// src/router/index.tsx
import {
  createRouter,
  createRootRoute,
  createRoute,
  redirect,
} from '@tanstack/react-router'
import { RootLayout } from './root-layout'
import { ChatScreen } from '@/features/agent/screens/chat-screen'
import { BoardScreen } from '@/features/board/screens/board-screen'
import { Dashboard } from '@/features/board/components/dashboard'

// Root layout (sidebar persists)
export const rootRoute = createRootRoute({ component: RootLayout })

// Canonicalize to /chats
const redirectRoot = createRoute({
  getParentRoute: () => rootRoute,
  path: '/', // visiting the site root
  beforeLoad: () => {
    throw redirect({ to: '/chats' })
  },
})

const redirectHome = createRoute({
  getParentRoute: () => rootRoute,
  path: '/home', // legacy /home
  beforeLoad: () => {
    throw redirect({ to: '/chats' })
  },
})

// /chats (new chat)
export const NewChatUrl = '/chats'
const chatsIndexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: NewChatUrl,
  component: ChatScreen,
})

// /chats/:id
export const ChatUrl = '/chats/$id'
const chatRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: ChatUrl,
  component: ChatScreen,
})

// /boards (dashboard)
export const DashboardUrl = '/boards'
const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: DashboardUrl,
  component: Dashboard,
})

// /boards/:id
export const BoardUrl = '/boards/$id'
const boardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: BoardUrl,
  component: BoardScreen,
})

const routeTree = rootRoute.addChildren([
  redirectRoot,
  redirectHome,
  chatsIndexRoute,
  chatRoute,
  dashboardRoute,
  boardRoute,
])

export const router = createRouter({ routeTree })

export type AppRouter = typeof router