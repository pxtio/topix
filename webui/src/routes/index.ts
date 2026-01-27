// src/router/index.tsx
import {
  createRouter,
  createRootRoute,
  createRoute,
  redirect,
} from "@tanstack/react-router"
import { RootLayout } from "./root-layout"
import { ChatScreen } from "@/features/agent/screens/chat-screen"
import { BoardScreen } from "@/features/board/screens/board-screen"
import { SigninPage } from "@/features/signin/screens/sign-in"
import { SignupPage } from "@/features/signin/screens/sign-up"
import { clearTokens, getAccessToken } from "@/features/signin/auth-storage"
import { decodeJwt } from "@/lib/decode-jwt"
import { SubscriptionsScreen } from "@/features/newsfeed/screens/subscriptions"
import { NewsfeedsScreen } from "@/features/newsfeed/screens/newsfeeds"
import { NewsfeedLinearPage } from "@/features/newsfeed/screens/newsfeed-linear-page"
import { HomePage } from "@/features/home/screens/home"
import { SheetScreen } from "@/features/board/screens/sheet-screen"
import { DashboardScreen } from "@/features/board/screens/dashboard-screen"
import { NotFoundPage } from "@/components/not-found"


export const rootRoute = createRootRoute({
  component: RootLayout,
  notFoundComponent: NotFoundPage,
})

// --- auth guard ---
const requireAuth = () => {
  const token = getAccessToken()
  if (!token) throw redirect({ to: "/signin" })
  try {
    const payload = decodeJwt(token)
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      clearTokens()
      throw redirect({ to: "/signin" })
    }
  } catch {
    clearTokens()
    throw redirect({ to: "/signin" })
  }
}

// auth pages (unguarded)
const signinRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/signin",
  component: SigninPage,
})

const signupRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/signup",
  component: SignupPage,
})

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  beforeLoad: requireAuth,
  component: HomePage,
})

const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/home",
  beforeLoad: () => { throw redirect({ to: "/" }) },
})

// /chats (protected)
export const NewChatUrl = "/chats"
const chatsIndexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: NewChatUrl,
  beforeLoad: requireAuth,
  component: ChatScreen,
})

// /chats/:id (protected)
export const ChatUrl = "/chats/$id"
const chatRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: ChatUrl,
  beforeLoad: requireAuth,
  component: ChatScreen,
})

// /boards (protected)
export const DashboardUrl = "/boards"
const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: DashboardUrl,
  beforeLoad: requireAuth,
  component: DashboardScreen,
})

// /boards/:id (protected)
export const BoardUrl = "/boards/$id"
const boardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: BoardUrl,
  beforeLoad: requireAuth,
  component: BoardScreen,
})

// /boards/:id/sheets/:noteId (protected)
export const SheetUrl = "/boards/$id/sheets/$noteId"
const sheetRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: SheetUrl,
  beforeLoad: requireAuth,
  component: SheetScreen,
})

// /subscriptions (protected)
export const SubscriptionsUrl = "/subscriptions"
const subscriptionsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: SubscriptionsUrl,
  beforeLoad: requireAuth,
  component: SubscriptionsScreen,
})

// /subscriptions/:id/newsfeeds (protected)
export const NewsfeedsUrl = "/subscriptions/$id"
const newsfeedsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: NewsfeedsUrl,
  beforeLoad: requireAuth,
  component: NewsfeedsScreen,
})

/**
 * /subscriptions/:id/newsfeeds/:newsfeedId → single newsletter
 * (child of the list route, same file for convenience)
 */
export const NewsfeedDetailUrl = "/subscriptions/$id/newsfeeds/$newsfeedId"
const newsfeedDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: NewsfeedDetailUrl,
  beforeLoad: requireAuth,
  component: NewsfeedLinearPage
})

const routeTree = rootRoute.addChildren([
  signinRoute,
  signupRoute,
  indexRoute,
  homeRoute,
  chatsIndexRoute,
  chatRoute,
  dashboardRoute,
  boardRoute,
  sheetRoute,
  subscriptionsRoute,
  newsfeedsRoute,
  newsfeedDetailRoute,
])

export const router = createRouter({ routeTree })
export type AppRouter = typeof router
