import { useEffect, useRef, useState } from "react"
import { Input } from "../ui/input"
import { Button } from "../ui/button"
import { useClickOutside } from "@/hooks/use-click-outside"
import { UNTITLED_LABEL } from "@/features/board/const"
import { HugeiconsIcon } from "@hugeicons/react"
import { PencilEditIcon, Tick01Icon } from "@hugeicons/core-free-icons"


/**
 * Label Editor Props type
 */
export interface LabelEditorProps {
  initialLabel: string
  onSave: (newLabel: string) => void
}


/**
 * Label Editor component for sidebar
 */
export const LabelEditor = ({ initialLabel, onSave }: LabelEditorProps) => {
  const [label, setLabel] = useState<string>(initialLabel)
  const [editMode, setEditMode] = useState<boolean>(false)

  const ref = useRef<HTMLDivElement>(null)

  const handleClick = () => {
    if (editMode) {
      onSave(label.trim())
    }
    setEditMode(!editMode)
  }

  const handleClickOutside = () => {
    setEditMode(false)
    if (label.trim() !== initialLabel.trim()) {
      onSave(label.trim())
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault()
      onSave(label.trim())
      setEditMode(false)
    }
  }

  useClickOutside(ref, handleClickOutside)

  useEffect(() => {
    setLabel(initialLabel)
  }, [initialLabel])

  return (
    <div ref={ref} className='flex flex-row items-center gap-2 text-sm font-medium'>
      {editMode ? (
        <Input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
        />
      ) : (
        <span>{label.trim() || UNTITLED_LABEL}</span>
      )}
      <Button variant="ghost" onClick={handleClick} size='icon'>
        {editMode ? (
          <HugeiconsIcon icon={Tick01Icon} className='size-4 shrink-0' strokeWidth={2} />
        ) : (
          <HugeiconsIcon icon={PencilEditIcon} className='size-4 shrink-0' strokeWidth={2} />
        )}
      </Button>
    </div>
  )
}