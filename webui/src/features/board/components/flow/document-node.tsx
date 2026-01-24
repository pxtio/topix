import { memo } from "react"
import type { NodeProps } from "@xyflow/react"
import type { NoteNode } from "../../types/flow"
import type { DocumentProperties } from "../../types/document"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import type { Style } from "../../types/style"
import { HugeiconsIcon } from "@hugeicons/react"
import { GoogleDocIcon } from "@hugeicons/core-free-icons"
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
    "h-full p-3 text-card-foreground bg-card shadow-sm border-2 flex flex-col justify-center items-center w-full",
    rounded,
    selected ? "border-secondary" : "border-border",
  )

  const content = (
    <div
      className={className}
    >
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
        Document
      </div>
      <div className="w-full mt-1 text-sm font-medium line-clamp-3 flex items-center gap-2">
        <HugeiconsIcon icon={GoogleDocIcon} strokeWidth={2} className="size-6" />
        <span className='truncate'>{displayLabel}</span>
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
