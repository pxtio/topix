import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { useSearchIcons } from "@/features/board/api/icon-search"
import { useDebouncedValue } from "@/features/board/hooks/debounce"
import { useState } from "react"
import { Icon } from "@iconify/react"
import { cn } from "@/lib/utils"


/**
 * Example usage of the Icon component from Iconify.
 */
export default function ThemedIcon({ iconName, className }: { iconName: string, className?: string }) {
  const clName = cn("text-card-foreground", className)

  return (
    <Icon
      icon={iconName}
      width="32"
      className={clName}
    />
  )
}


export interface IconSearchDialogProps {
  openIconSearch: boolean
  setOpenIconSearch: (open: boolean) => void
}


/**
 * Dialog component for searching and selecting icons.
 */
export const IconSearchDialog = ({
  openIconSearch,
  setOpenIconSearch
}: IconSearchDialogProps) => {
  const [q, setQ] = useState<string>('')

  const debouncedQ = useDebouncedValue<string>({ value: q, delay: 300 })

  const { data, isLoading } = useSearchIcons({ query: debouncedQ })

  const handleSelectIcon = (iconName: string) => {
    // Future: insert selected icon into canvas
    console.log("Selected icon:", iconName)
    setOpenIconSearch(false)
  }

  return (
    <Dialog open={openIconSearch} onOpenChange={setOpenIconSearch}>
      <DialogContent className='sm:max-w-xl p-0 overflow-hidden'>
        <DialogHeader className='p-4 border-b text-secondary w-full text-center'>
          <DialogTitle>Search icons</DialogTitle>
        </DialogHeader>
        <div className='p-4 pt-3'>
          <Input
            placeholder='Search Icon…'
            value={q}
            onChange={e => setQ(e.target.value)}
            autoFocus
            className='focus-visible:ring-2 focus-visible:ring-secondary/75 focus-visible:border-secondary'
          />
        </div>
        <div className='px-4 pb-4'>
          {isLoading ? (
            <div className='grid grid-cols-3 sm:grid-cols-4 gap-3'>
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className='aspect-square w-full' />
              ))}
            </div>
          ) : (
            <ScrollArea className='max-h-[50vh]'>
              <div className='grid grid-cols-3 sm:grid-cols-4 gap-3 pr-2'>
                {data?.map(icon => (
                  <button
                    key={icon.url}
                    className='group relative aspect-square rounded-md border hover:ring-2 hover:ring-secondary/75 grid place-items-center p-3 bg-card'
                    title={icon.name}
                    onClick={() => handleSelectIcon(icon.name)}
                  >
                    <ThemedIcon iconName={icon.name} />
                  </button>
                ))}
                {debouncedQ && !data?.length && (
                  <div className='col-span-full text-sm text-muted-foreground p-4'>No results</div>
                )}
              </div>
            </ScrollArea>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}