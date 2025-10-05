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
import { Dashboard } from "@/features/board/components/dashboard"
import { SigninPage } from "@/features/signin/screens/sign-in"
import { SignupPage } from "@/features/signin/screens/sign-up"
import { clearTokens, getAccessToken } from "@/features/signin/auth-storage"
import { decodeJwt } from "@/lib/decode-jwt"
import { SubscriptionsScreen } from "@/features/newsfeed/screens/subscriptions"
import { NewsfeedsScreen } from "@/features/newsfeed/screens/newsfeeds"
import { NewsfeedLinearPage } from "@/features/newsfeed/screens/newsfeed-linear-page"
export const rootRoute = createRootRoute({ component: RootLayout })

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

// Canonicalize to /chats
const redirectRoot = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  beforeLoad: () => { throw redirect({ to: "/chats" }) },
})

const redirectHome = createRoute({
  getParentRoute: () => rootRoute,
  path: "/home",
  beforeLoad: () => { throw redirect({ to: "/chats" }) },
})

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
  component: Dashboard,
})

// /boards/:id (protected)
export const BoardUrl = "/boards/$id"
const boardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: BoardUrl,
  beforeLoad: requireAuth,
  component: BoardScreen,
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
export const newsfeedDetailRoute = createRoute({
  getParentRoute: () => newsfeedsRoute,
  path: '/subscriptions/$id/newsfeeds/$newsfeedId',
  beforeLoad: requireAuth,
  component: NewsfeedLinearPage
})

const routeTree = rootRoute.addChildren([
  redirectRoot,
  redirectHome,
  signinRoute,
  signupRoute,
  chatsIndexRoute,
  chatRoute,
  dashboardRoute,
  boardRoute,
  subscriptionsRoute,
  newsfeedsRoute,
  newsfeedDetailRoute,
])

export const router = createRouter({ routeTree })
export type AppRouter = typeof router