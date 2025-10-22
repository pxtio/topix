import { cn } from "@/lib/utils"
import { Icon } from "@iconify/react"

export interface IconShapeProps {
  iconName: string
  className?: string
}

/**
 * A perfectly square icon container (1:1 ratio),
 * with the icon sized to ~75% of the container.
 */
export const IconShape = ({ iconName, className }: IconShapeProps) => {
  const clName = cn(
    "relative aspect-square flex items-center justify-center text-card-foreground w-full",
    className
  )

  return (
    <div className={clName}>
      <Icon
        icon={iconName}
        className="w-[75%] h-[75%] text-inherit bg-transparent"
      />
    </div>
  )
}