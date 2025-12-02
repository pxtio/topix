import * as React from "react"
import { cn } from "@/lib/utils"

// Hugeicons
import {
  Image01Icon,
  CancelCircleIcon,
  Download04Icon,
} from "@hugeicons/core-free-icons"
import { useGetImage } from "../../api/get-image"
import { HugeiconsIcon } from "@hugeicons/react"

type AgentImageProps = {
  filename?: string
  alt?: string
  className?: string
}


/**
 * 
 * @param param0 
 * @returns 
 */
export const ImageGenView = ({
  filename,
  alt,
  className
}: AgentImageProps) => {
  const { data, isLoading, isError, isFetching } = useGetImage(filename ?? "")

  const isPending = isLoading || isFetching || !filename
  const hasImage = !!data && !isError && !!filename

  const handleDownload = React.useCallback(() => {
    if (!data) return

    const link = document.createElement("a")
    link.href = data
    link.download = filename || "image"
    document.body.appendChild(link)
    link.click()
    link.remove()
  }, [data, filename])

  return (
    <div
      className={cn(
        "relative max-w-[600px] w-full rounded-xl overflow-hidden bg-muted border",
        className
      )}
    >
      {/* Loading / no filename placeholder */}
      {isPending && (
        <div className="flex aspect-square w-full items-center justify-center animate-pulse">
          <HugeiconsIcon
            icon={Image01Icon}
            size={48}
            className="opacity-60"
            strokeWidth={2}
          />
        </div>
      )}

      {/* Error */}
      {!isPending && isError && (
        <div className="flex aspect-square w-full items-center justify-center">
          <HugeiconsIcon
            icon={CancelCircleIcon}
            size={48}
            className="text-destructive opacity-80"
            strokeWidth={2}
          />
        </div>
      )}

      {/* Success */}
      {hasImage && (
        <div className="relative w-full aspect-square">
          <img
            src={data}
            alt={alt ?? filename ?? "Agent image"}
            className="block w-full h-full object-contain"
          />

          <button
            type="button"
            onClick={handleDownload}
            className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-background/80 shadow-sm backdrop-blur-sm border hover:bg-accent transition"
            aria-label="Download image"
          >
            <HugeiconsIcon icon={Download04Icon} className="size-4" strokeWidth={2} />
          </button>
        </div>
      )}
    </div>
  )
}