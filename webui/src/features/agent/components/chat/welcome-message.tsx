import { cn } from '@/lib/utils'
import { Suspense, lazy, useEffect, useMemo, useState } from 'react'

const DotLottieReact = lazy(async () => {
  const m = await import('@lottiefiles/dotlottie-react')
  return { default: m.DotLottieReact }
})

const MASCOTS = [
  {
    name: 'Dog',
    file: 'Dog.lottie',
    message: "Ask me anything — I’ll sniff the repos and fetch the facts!",
  },
  {
    name: 'Cat',
    file: 'Cat.lottie',
    message: 'Curiosity compiled — I pounce on citations so you don’t have to.',
  },
  {
    name: 'Shark',
    file: 'Shark.lottie',
    message: 'I circle the docs and bite into the signal — fast, sharp answers.',
  },
  {
    name: 'Mouse',
    file: 'Mouse.lottie',
    message: 'Tiny agent, mighty findings — I’ll nibble through noise to signal.',
  },
  {
    name: 'Panda',
    file: 'Panda.lottie',
    message: 'Open‑source and bamboo‑strong — let’s de‑bamboo‑zle your docs.',
  },
  {
    name: 'Dolphin',
    file: 'Dolphin.lottie',
    message: 'Sleek, social, and smart — I’ll dive deep for data and surface insights.',
  },
  {
    name: 'Elephant',
    file: 'Elephant.lottie',
    message: 'I never forget a fact — big memory, bigger context.',
  },
  {
    name: 'Dove',
    file: 'Dove.lottie',
    message: 'Peaceful queries, pure answers — I’ll keep your search serene.',
  },
  {
    name: 'Penguin',
    file: 'Penguin.lottie',
    message: 'Cool under pressure — waddling through datasets like ice.',
  },
  {
    name: 'Toucan',
    file: 'Toucan.lottie',
    message: 'Two can play at that game — I’ll squawk up the right sources.',
  },
  {
    name: 'Starfish',
    file: 'Starfish.lottie',
    message: 'Reach for every branch of knowledge — regeneration guaranteed.',
  },
  {
    name: 'Spider',
    file: 'Spider.lottie',
    message: 'Spinning a web of open data — I catch insights others miss.',
  },
  {
    name: 'Pig',
    file: 'Pig.lottie',
    message: 'Rooting through the noise — I’ll sniff out the truffles of truth.',
  },
] as const

export type MascotName = typeof MASCOTS[number]['name']

function useRandomMascot() {
  const [index, setIndex] = useState<number | null>(null)

  useEffect(() => {
    setIndex(Math.floor(Math.random() * MASCOTS.length))
  }, [])

  const mascot = useMemo(() => (index == null ? null : MASCOTS[index]), [index])

  return { mascot, reshuffle: () => setIndex(Math.floor(Math.random() * MASCOTS.length)) }
}

function Oc({ file, size = 100 }: { file: string; size?: number }) {
  const src = `${import.meta.env.BASE_URL}animations/${file}`
  const box = { width: size, height: size }
  return (
    <Suspense fallback={<div style={box} />}>
      <DotLottieReact src={src} autoplay loop style={box} />
    </Suspense>
  )
}

export function WelcomeMessage() {
  const { mascot, reshuffle } = useRandomMascot()

  if (!mascot) {
    return (
      <div className="relative w-full flex flex-row items-center justify-center gap-2">
        <div style={{ width: 100, height: 100 }} />
        <div className="text-xl text-card-foreground">
          <span>Loading your open‑source sidekick…</span>
        </div>
      </div>
    )
  }

  return (
    <div className="relative w-full flex flex-row items-center justify-center gap-2">
      <Oc file={mascot.file} />
      <div className="text-xl text-card-foreground">
        <span>{mascot.message}</span>
      </div>
      <button
        type="button"
        className="ml-2 rounded-2xl px-3 py-1 text-xs font-medium text-accent-foreground/50 bg-accent hover:bg-muted shadow-sm hover:text-accent-foreground transition-colors"
        onClick={reshuffle}
        aria-label="Shuffle welcome message"
      >
        Shuffle
      </button>
    </div>
  )
}

export function ThemedWelcome({ name, message, className }: { name: MascotName, message?: string, className?: string }) {
  const mascot = MASCOTS.find(m => m.name === name) ?? MASCOTS[0]

  const customMessage = message ?? mascot.message

  const divClass = cn(
    "relative w-full flex flex-row items-center justify-center gap-2",
    className
  )

  return (
    <div className={divClass}>
      <Oc file={mascot.file} />
      <div className="text-xl text-card-foreground">
        <span>{customMessage}</span>
      </div>
    </div>
  )
}