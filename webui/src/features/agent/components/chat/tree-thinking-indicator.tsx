import { Suspense, lazy } from "react"


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
  const lastFrame = 8

  return (
    <Suspense fallback={<div style={frameStyle} className='shrink-0' />}>
      <div
        style={frameStyle}
        className='relative shrink-0 overflow-hidden'
      >
        <div className='absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[54%]'>
          {
            isStopped ? (
              <DotLottieReact
                key='tree-stopped'
                src={src}
                autoplay={false}
                loop={false}
                segment={[lastFrame, lastFrame]}
                useFrameInterpolation={false}
                style={playerStyle}
              />
            ) : (
              <DotLottieReact
                key='tree-streaming'
                src={src}
                autoplay
                loop
                style={playerStyle}
              />
            )
          }
        </div>
      </div>
    </Suspense>
  )
}
