import { useEffect, useRef, useState } from "react"
import { Input } from "../ui/input"
import { Button } from "../ui/button"
import { Edit, Save } from "lucide-react"
import { useClickOutside } from "@/hooks/use-click-outside"
import { UNTITLED_LABEL } from "@/features/board/const"


/**
 * Props for the LabelEditor component.
 */
export interface LabelEditorProps {
  initialLabel: string
  onSave: (newLabel: string) => void
}


/**
 * LabelEditor component for editing labels.
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

  useClickOutside(ref, handleClickOutside)

  useEffect(() => {
    setLabel(initialLabel)
  }, [initialLabel])

  return (
    <div ref={ref} className='flex flex-row items-center gap-2 text-sm font-medium'>
      {
        editMode ?
        <Input value={label} onChange={(e) => setLabel(e.target.value)} />
        :
        <span>{label.trim() || UNTITLED_LABEL}</span>
      }
      <Button
        variant="ghost"
        onClick={handleClick}
        size='sm'
      >
        {
          editMode ?
          <Save className='size-3' strokeWidth={1.75} />
          :
          <Edit className='size-3' strokeWidth={1.75} />
        }
      </Button>
    </div>
  )
}