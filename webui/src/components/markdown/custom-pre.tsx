import React from "react"
import { cn } from "@/lib/utils"

export function Pre(props: React.HTMLAttributes<HTMLPreElement>) {
  return (
    <pre
      {...props}
      className={cn(
        "w-full min-w-0 max-w-full",
        "mk-scroll overflow-x-auto",
        "rounded-2xl bg-transparent",
        "text-sm",
        props.className
      )}
    />
  )
}