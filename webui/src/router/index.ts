// src/router/index.tsx
import {
  createRouter,
  createRootRoute,
  createRoute,
  redirect,
} from '@tanstack/react-router'
import { RootLayout } from './root-layout'
import { NewChat, ChatView, BoardView } from '../features/demo'

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
const chatsIndexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/chats',
  component: NewChat,
})

// /chats/:id
const chatRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/chats/$id',
  component: ChatView,
})

// /boards/:id
const boardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/boards/$id',
  component: BoardView,
})

const routeTree = rootRoute.addChildren([
  redirectRoot,
  redirectHome,
  chatsIndexRoute,
  chatRoute,
  boardRoute,
])

export const router = createRouter({ routeTree })

export type AppRouter = typeof router