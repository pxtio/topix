import { cn } from "@/lib/utils"

export interface ImageShapeProps {
  imageUrl: string
  className?: string
}

/**
 * A container for displaying an image within a note.
 */
export const ImageShape = ({ imageUrl, className }: ImageShapeProps) => {
  const clName = cn(
    "w-full flex justify-center",
    className
  )

  return (
    <div className={clName}>
      <img
        src={imageUrl}
        alt="Note Image"
        className="w-full h-auto object-contain"
      />
    </div>
  )
}