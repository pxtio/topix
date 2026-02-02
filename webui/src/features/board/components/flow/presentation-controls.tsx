import { ChevronLeft, ChevronRight, StopCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

type PresentationControlsProps = {
  onPrev: () => void
  onNext: () => void
  onStop: () => void
  disablePrev?: boolean
  disableNext?: boolean
}

export function PresentationControls({
  onPrev,
  onNext,
  onStop,
  disablePrev,
  disableNext,
}: PresentationControlsProps) {
  return (
    <div
      className={`
        fixed z-50 left-1/2 bottom-4 -translate-x-1/2
        bg-sidebar/90 backdrop-blur-md border border-border rounded-full
        px-3 py-2 shadow-lg flex items-center gap-2
      `}
      role="toolbar"
      aria-label="Presentation controls"
    >
      <Button size="icon" variant="ghost" onClick={onPrev} disabled={disablePrev} title="Previous slide" aria-label="Previous slide">
        <ChevronLeft className="size-4" />
      </Button>
      <Button size="icon" variant="ghost" onClick={onNext} disabled={disableNext} title="Next slide" aria-label="Next slide">
        <ChevronRight className="size-4" />
      </Button>
      <Button size="icon" variant="destructive" onClick={onStop} title="Stop presenting" aria-label="Stop presenting">
        <StopCircle className="size-4" />
      </Button>
    </div>
  )
}
