import './shiny-text.css'

export const ShinyText = ({
  text,
  disabled = false,
  speed = 5,
  className = ''
}: {
  text: string
  disabled?: boolean
  speed?: number // in seconds
  className?: string
}) => {
  const animationDuration = `${speed}s`

  return (
    <div className={`shiny-text ${disabled ? 'disabled' : ''} ${className}`} style={{ animationDuration }}>
      {text}
    </div>
  )
}