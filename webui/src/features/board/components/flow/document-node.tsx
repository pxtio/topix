import { memo } from "react"
import type { NodeProps } from "@xyflow/react"
import type { NoteNode } from "../../types/flow"
import type { DocumentProperties } from "../../types/document"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import type { Style } from "../../types/style"
import { Icon } from "@iconify/react"
import { cn } from "@/lib/utils"


/**
 * A node component for displaying document nodes in the flow board.
 */
export const DocumentNode = memo(function DocumentNode({ data, selected }: NodeProps<NoteNode>) {
  const label = data.label?.markdown?.trim()
  const summary = (data.properties as DocumentProperties)?.summary?.text?.trim()
  const displayLabel = label || "Untitled document"
  const style = data.style as Style | undefined
  const rounded = (style?.roundness ?? 1) > 0 ? "rounded-xl" : "rounded-none"

  const className = cn(
    "p-1 text-card-foreground bg-transparent border-2 flex flex-col justify-center items-center text-center w-full",
    rounded,
    selected ? "border-secondary" : "border-transparent",
  )

  const content = (
    <div
      className={className}
    >
      <div className="text-secondary">
        <Icon icon="solar:document-text-bold-duotone" className="size-36" />
      </div>
      <div className="mt-2 text-sm font-medium line-clamp-2 break-words max-w-[180px]">
        <span className="block">{displayLabel}</span>
      </div>
    </div>
  )

  if (!summary) {
    return content
  }

  return (
    <Tooltip delayDuration={300}>
      <TooltipTrigger asChild>
        {content}
      </TooltipTrigger>
      <TooltipContent side="top" align="center" className="max-w-72">
        <p className="text-xs leading-relaxed">{summary}</p>
      </TooltipContent>
    </Tooltip>
  )
})
