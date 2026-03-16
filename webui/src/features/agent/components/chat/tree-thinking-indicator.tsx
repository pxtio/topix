import { Suspense, lazy } from "react"
import { cn } from "@/lib/utils"


const DotLottieReact = lazy(async () => {
  const module = await import("@lottiefiles/dotlottie-react")
  return { default: module.DotLottieReact }
})


/**
 * TreeAnimation renders the reasoning animation from the public animations directory.
 */
function TreeAnimation({ size = 42 }: { size?: number }) {
  const src = `${import.meta.env.BASE_URL}animations/Tree.lottie`
  const frameStyle = { width: size, height: size }
  const playerStyle = { width: size * 4, height: size * 1.5 }

  return (
    <Suspense fallback={<div style={frameStyle} className='shrink-0' />}>
      <div
        style={frameStyle}
        className='relative shrink-0 overflow-hidden'
      >
        <div className='absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[54%]'>
          <DotLottieReact src={src} autoplay loop style={playerStyle} />
        </div>
      </div>
    </Suspense>
  )
}


/**
 * TreeThinkingIndicator shows the tree Lottie while reasoning and a static icon when finished.
 */
export function TreeThinkingIndicator({
  message,
  isStopped = false,
  className
}: {
  message: string
  isStopped?: boolean
  className?: string
}) {
  return (
    <div className={cn("flex flex-row items-center gap-2", className)}>
      {
        !isStopped && (
          <div className='shrink-0'>
            <TreeAnimation />
          </div>
        )
      }
      <span className="text-sm text-muted-foreground">
        {message}
      </span>
    </div>
  )
}
