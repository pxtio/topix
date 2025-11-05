import { useMemo } from "react"
import { useAppStore } from "@/store"
import { useListBoards } from "../api/list-boards"
import { BoardCard, NewBoardCard } from "./board-card"
import { ThemedWelcome } from "@/features/agent/components/chat/welcome-message"
import clsx from "clsx"
import type { Graph } from "../types/board"

/**
 * Dashboard component displaying user's boards, styled like SubscriptionsPage.
 */
export const Dashboard = ({ className, hideTitle = false }: { className?: string; hideTitle?: boolean }) => {
  const userId = useAppStore((state) => state.userId)
  const { data: boards, isLoading, isError } = useListBoards({ userId })

  const pageClassName = clsx("w-full h-full", className)

  const sorted = useMemo(
    () =>
      (boards ?? [])
        .slice()
        .sort((a: Graph, b: Graph) => {
          const aT = new Date(a.createdAt ?? 0).getTime()
          const bT = new Date(b.createdAt ?? 0).getTime()
          return bT - aT
        }),
    [boards]
  )

  return (
    <div className={pageClassName}>
      {
        !hideTitle && (
          <div className="pt-8 pb-4">
            <ThemedWelcome name="Dog" message="Boards" />
          </div>
        )
      }

      <div className="mx-auto max-w-5xl p-4">
        <div
          className="
            grid gap-4
            [grid-template-columns:repeat(auto-fill,minmax(18rem,1fr))]
            items-stretch justify-items-stretch
          "
          role="list"
          aria-label="Boards"
        >
          <div className="w-full h-full flex justify-center items-center">
            <NewBoardCard />
          </div>

          {sorted.map((board: Graph) => (
            <div key={board.uid} className="w-full h-full flex justify-center items-center">
              <BoardCard board={board} />
            </div>
          ))}

          {isLoading &&
            Array.from({ length: 3 }).map((_, i) => (
              <div
                key={`skeleton-${i}`}
                className="w-full h-48 rounded-2xl border border-border/60 bg-muted/30 animate-pulse"
                aria-hidden="true"
              />
            ))}
        </div>

        {isLoading && (
          <div className="text-center mt-6 text-muted-foreground text-sm">
            Loading…
          </div>
        )}
        {isError && (
          <div className="text-center mt-6 text-destructive text-sm">
            Failed to load boards
          </div>
        )}
        {!isLoading && !isError && sorted.length === 0 && (
          <div className="text-center mt-8 text-muted-foreground">
            No boards yet. Create your first one above!
          </div>
        )}
      </div>
    </div>
  )
}