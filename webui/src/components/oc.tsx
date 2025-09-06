import { Suspense, lazy } from 'react'

const DotLottieReact = lazy(async () => {
  const m = await import('@lottiefiles/dotlottie-react')
  return { default: m.DotLottieReact }
})

export function Oc() {
  const src = `${import.meta.env.BASE_URL}animations/happyDog.lottie`
  const box = { width: 240, height: 240 }

  return (
    <Suspense fallback={<div style={box} />}>
      <DotLottieReact src={src} autoplay loop style={box} />
    </Suspense>
  )
}
