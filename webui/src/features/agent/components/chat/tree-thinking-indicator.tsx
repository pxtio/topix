import { Suspense, lazy, useEffect, useState } from "react"
import type { DotLottie } from "@lottiefiles/dotlottie-web"


const DotLottieReact = lazy(async () => {
  const module = await import("@lottiefiles/dotlottie-react")
  return { default: module.DotLottieReact }
})


/**
 * TreeAgentIcon renders the assistant tree animation and freezes it on the last frame when stopped.
 */
export function TreeAgentIcon({
  size = 40,
  isStopped = false
}: {
  size?: number
  isStopped?: boolean
}) {
  const src = `${import.meta.env.BASE_URL}animations/Tree.lottie`
  const frameStyle = { width: size, height: size }
  const playerStyle = { width: size * 4, height: size * 1.5 }
  const stoppedFrame = 8
  const [dotLottie, setDotLottie] = useState<DotLottie | null>(null)

  useEffect(() => {
    if (!dotLottie) {
      return
    }

    let isCancelled = false

    /**
     * Applies the current playback mode once the player is ready.
     */
    const syncPlayback = async () => {
      if (isCancelled) {
        return
      }

      if (isStopped) {
        await dotLottie.setLoop(false)
        await dotLottie.setFrame(stoppedFrame)
        // console.log("Pausing at frame", stoppedFrame)
        await dotLottie.pause()
        return
      }

      await dotLottie.setLoop(true)
      await dotLottie.setFrame(0)
      await dotLottie.play()
    }

    const handleReady = () => {
      void syncPlayback()
    }

    if (dotLottie.isReady || dotLottie.isLoaded) {
      void syncPlayback()
    } else {
      dotLottie.addEventListener("ready", handleReady)
      dotLottie.addEventListener("load", handleReady)
    }

    return () => {
      isCancelled = true
      dotLottie.removeEventListener("ready", handleReady)
      dotLottie.removeEventListener("load", handleReady)
    }
  }, [dotLottie, isStopped])

  return (
    <Suspense fallback={<div style={frameStyle} className='shrink-0' />}>
      <div
        style={frameStyle}
        className='relative shrink-0 overflow-hidden'
      >
        <div className='absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[54%]'>
          <DotLottieReact
            src={src}
            autoplay={!isStopped}
            loop={!isStopped}
            useFrameInterpolation={false}
            style={playerStyle}
            dotLottieRefCallback={setDotLottie}
          />
        </div>
      </div>
    </Suspense>
  )
}
