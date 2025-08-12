import { useTheme } from "@/components/theme-provider"
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import EmojiPicker, { EmojiStyle, Theme } from 'emoji-picker-react'


/**
 * Props for the IconPicker component.
 */
export interface IconPickerProps {
  onSelect: (emoji: { emoji: string }) => void
}


/**
 * Component to select an emoji icon.
 */
export const IconPicker = ({ onSelect }: IconPickerProps) => {
  const { theme } = useTheme()
  const handleEmojiSelect = (emoji: { emoji: string }) => {
    // Handle emoji selection here
    onSelect(emoji)
  }

  const pickerTheme = theme === "dark" ? Theme.DARK : Theme.LIGHT

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className='transition-colors px-2 py-1 text-accent-foreground/50 hover:text-accent-foreground'>
            Select Emoji
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="left" sideOffset={10}>
          <EmojiPicker
            onEmojiClick={handleEmojiSelect}
            emojiStyle={EmojiStyle.NATIVE}
            lazyLoadEmojis
            theme={pickerTheme}
          />
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  )
}