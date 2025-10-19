import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { useSearchImages } from "@/features/board/api/image-search"
import { useDebouncedValue } from "@/features/board/hooks/debounce"
import { useState } from "react"


export interface ImageSearchDialogProps {
  openImageSearch: boolean
  setOpenImageSearch: (open: boolean) => void
}


/**
 * Dialog component for searching and selecting images.
 */
export const ImageSearchDialog = ({ openImageSearch, setOpenImageSearch }: ImageSearchDialogProps) => {
  const [q, setQ] = useState<string>('')

  const debouncedQ = useDebouncedValue<string>({ value: q, delay: 300 })

  const { data, isLoading } = useSearchImages({ query: debouncedQ })

  const handleSelectImage = (imgUrl: string) => {
    // Future: insert selected image into canvas
    console.log("Selected image:", imgUrl)
    setOpenImageSearch(false)
  }

  return (
    <Dialog open={openImageSearch} onOpenChange={setOpenImageSearch}>
      <DialogContent className='sm:max-w-2xl p-0 overflow-hidden'>
        <DialogHeader className='p-4 border-b'>
          <DialogTitle>Search images</DialogTitle>
        </DialogHeader>
        <div className='p-4 pt-3'>
          <Input
            placeholder='Search Unsplash…'
            value={q}
            onChange={e => setQ(e.target.value)}
            autoFocus
          />
        </div>
        <div className='px-4 pb-4'>
          {isLoading ? (
            <div className='grid grid-cols-2 sm:grid-cols-3 gap-3'>
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className='aspect-square w-full' />
              ))}
            </div>
          ) : (
            <ScrollArea className='max-h-[50vh]'>
              <div className='grid grid-cols-2 sm:grid-cols-3 gap-3 pr-2'>
                {data?.map(img => (
                  <button
                    key={img.url}
                    className='group relative aspect-square rounded-md overflow-hidden border hover:ring-2 hover:ring-ring'
                    onClick={() => handleSelectImage(img.url)}
                  >
                    <img src={img.url} alt={img.description || 'image'} className='size-full object-cover' />
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