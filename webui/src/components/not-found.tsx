import { Suspense, lazy } from 'react'

const DotLottieReact = lazy(async () => {
  const m = await import('@lottiefiles/dotlottie-react')
  return { default: m.DotLottieReact }
})

/**
 * 404 Lottie Animation
 */
function Lottie404({ size = 540 }: { size?: number }) {
  const src = `${import.meta.env.BASE_URL}animations/404.lottie`
  const box = { width: size, height: size }
  return (
    <Suspense fallback={<div style={box} />}>
      <DotLottieReact src={src} autoplay loop style={box} />
    </Suspense>
  )
}


/**
 * 404 Not Found Page
 */
export function NotFoundPage() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-transparent">
      <div className="flex flex-col items-center justify-center gap-0 text-center px-4">
        <div className="text-3xl sm:text-4xl font-semibold text-foreground">Page not found</div>
        <Lottie404 />
      </div>
    </div>
  )
}
