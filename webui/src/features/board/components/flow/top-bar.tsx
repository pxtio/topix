import { memo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  ArrowMoveDownRightIcon,
  BitcoinPresentationIcon,
  ChartBubble02Icon,
  CircleIcon,
  Cursor02Icon,
  DiamondIcon,
  FolderAddIcon,
  GeometricShapes01Icon,
  GoogleDocIcon,
  Hold01Icon,
  Hold02Icon,
  Image02Icon,
  LabelIcon,
  LeftToRightListBulletIcon,
  Note02Icon,
  MoreHorizontalIcon,
  SquareIcon,
  Share08Icon,
  Tag01Icon,
  TextIcon,
} from '@hugeicons/core-free-icons'
import { BotMessageSquare, ChevronDown, Cloud, Layers, Sparkles } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import clsx from 'clsx'
import { FREE_PLAN_DOCUMENT_LIMIT_TOOLTIP } from '../../lib/board-limit'

import type { AddNoteNodeOptions } from '../../hooks/use-add-node'
import type { NodeType } from '../../types/style'
import { useGraphStore } from '../../store/graph-store'


type ViewMode = 'graph' | 'linear'


type Props = {
  onAddNode: (options: AddNoteNodeOptions) => void
  onAddLine: () => void
  viewMode: ViewMode
  setViewMode: (mode: ViewMode) => void
  enableSelection: boolean
  setEnableSelection: (mode: boolean) => void
  openShapeMenu: boolean
  setOpenShapeMenu: (open: boolean) => void
  setOpenIconSearch: (open: boolean) => void
  setOpenImageSearch: (open: boolean) => void
  setOpenDocumentUpload: (open: boolean) => void
  setOpenChatDialog: (open: boolean) => void
  chatOpen: boolean
  setOpenAiSpark: (open: boolean) => void
  onToggleSlidesPanel: () => void
  slidesPanelOpen: boolean
  boardId?: string
  boardVisibility: 'private' | 'public'
  onUpdateVisibility: (visibility: 'private' | 'public') => Promise<void>
  documentUploadLimited: boolean
}


export const TopBar = memo(function TopBar({
  onAddNode,
  onAddLine,
  viewMode,
  setViewMode,
  enableSelection,
  setEnableSelection,
  openShapeMenu,
  setOpenShapeMenu,
  setOpenIconSearch,
  setOpenImageSearch,
  setOpenDocumentUpload,
  setOpenChatDialog,
  chatOpen,
  setOpenAiSpark,
  onToggleSlidesPanel,
  slidesPanelOpen,
  boardId,
  boardVisibility,
  onUpdateVisibility,
  documentUploadLimited,
}: Props) {
  const currentFolderDepth = useGraphStore(state => state.currentFolderDepth)
  const maxFolderDepth = useGraphStore(state => state.maxFolderDepth)
  const isAtMaxFolderDepth = currentFolderDepth < 0 || currentFolderDepth >= maxFolderDepth
  const normalButtonClass = 'transition-colors text-card-foreground hover:bg-sidebar-primary hover:text-sidebar-primary-foreground p-2.5 rounded-lg flex items-center justify-center gap-2'
  const activeButtonClass = clsx(normalButtonClass, 'bg-sidebar-primary text-secondary')
  const [openShareDialog, setOpenShareDialog] = useState(false)
  const [isUpdatingSharing, setIsUpdatingSharing] = useState(false)
  const [shareError, setShareError] = useState<string | null>(null)

  const shapeOptions: { nodeType: NodeType; label: string; icon: React.ReactNode }[] = [
    { nodeType: 'rectangle', label: 'Rectangle', icon: <HugeiconsIcon icon={SquareIcon} className='size-4 shrink-0' strokeWidth={2} /> },
    { nodeType: 'layered-rectangle', label: 'Layered card', icon: <Layers className='w-4 h-4 shrink-0' /> },
    { nodeType: 'ellipse', label: 'Ellipse', icon: <HugeiconsIcon icon={CircleIcon} className='size-4 shrink-0' strokeWidth={2} /> },
    { nodeType: 'diamond', label: 'Diamond', icon: <HugeiconsIcon icon={DiamondIcon} className='size-4 shrink-0' strokeWidth={2} /> },
    { nodeType: 'soft-diamond', label: 'Double diamond', icon: <HugeiconsIcon icon={DiamondIcon} className='size-4 shrink-0' strokeWidth={2} /> },
    { nodeType: 'layered-diamond', label: 'Layered diamond', icon: <Layers className='w-4 h-4 shrink-0' /> },
    { nodeType: 'layered-circle', label: 'Layered circle', icon: <HugeiconsIcon icon={CircleIcon} className='size-4 shrink-0' strokeWidth={2} /> },
    { nodeType: 'tag', label: 'Tag', icon: <HugeiconsIcon icon={LabelIcon} className='size-4 shrink-0' strokeWidth={2} /> },
    { nodeType: 'thought-cloud', label: 'Cloud', icon: <Cloud className='w-4 h-4 shrink-0' /> },
    { nodeType: 'capsule', label: 'Capsule', icon: <HugeiconsIcon icon={Tag01Icon} className='size-4 shrink-0' strokeWidth={2} /> },
  ]

  const tooltipCopy = {
    graph: 'Graph view',
    files: 'Files view',
    pan: 'Pan mode',
    select: 'Selection mode',
    note: 'Sticky note',
    folder: isAtMaxFolderDepth
      ? (currentFolderDepth < 0 ? 'Resolving folder depth...' : `Max folder depth reached (${maxFolderDepth})`)
      : 'Folder',
    document: documentUploadLimited ? FREE_PLAN_DOCUMENT_LIMIT_TOOLTIP : 'Upload document',
    shape: 'Shapes',
    connector: 'Connector',
    text: 'Text',
    assistant: 'Assistant',
    slides: 'Slides',
    share: 'Share board',
    more: 'More actions',
  }

  const isPublicShared = boardVisibility === 'public'

  const handleTogglePublicShare = async () => {
    if (!boardId || isUpdatingSharing) return
    setShareError(null)
    setIsUpdatingSharing(true)
    try {
      await onUpdateVisibility(isPublicShared ? 'private' : 'public')
    } catch (error) {
      setShareError(error instanceof Error ? error.message : 'Could not update sharing')
    } finally {
      setIsUpdatingSharing(false)
    }
  }

  const handleCopyShareLink = async () => {
    if (!boardId) return
    const url = `${window.location.origin}/boards/${boardId}`
    try {
      await navigator.clipboard.writeText(url)
    } catch (error) {
      setShareError(error instanceof Error ? error.message : 'Could not copy link')
    }
  }

  return (
    <div
      className='absolute z-50 border border-border shadow-md backdrop-blur-md supports-[backdrop-filter]:bg-sidebar/80 backdrop-saturate-150 bg-sidebar text-sidebar-foreground rounded-xl p-1 flex gap-1 right-2 top-1/2 -translate-y-1/2 flex-col items-center max-h-[82vh] overflow-y-auto md:left-1/2 md:right-auto md:top-2 md:-translate-x-1/2 md:-translate-y-0 md:flex-row md:items-center md:max-h-none md:overflow-visible'
      role='toolbar'
      aria-label='Board top bar'
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant={null} size='default' onClick={() => setViewMode('graph')} className={viewMode === 'graph' ? activeButtonClass : normalButtonClass}>
            <HugeiconsIcon icon={ChartBubble02Icon} className='size-4 shrink-0' strokeWidth={2} />
            <span className='text-[10px] sr-only md:not-sr-only'>Graph</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side='bottom' sideOffset={10}>{tooltipCopy.graph}</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant={null} size='default' onClick={() => setViewMode('linear')} className={viewMode === 'linear' ? activeButtonClass : normalButtonClass}>
            <HugeiconsIcon icon={LeftToRightListBulletIcon} className='size-4 shrink-0' strokeWidth={2} />
            <span className='text-[10px] sr-only md:not-sr-only'>Files</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side='bottom' sideOffset={10}>{tooltipCopy.files}</TooltipContent>
      </Tooltip>

      <Separator orientation="vertical" className='md:!h-6 hidden md:block' />

      {viewMode === 'graph' && (
        <>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant={null} size='icon' onClick={() => setEnableSelection(!enableSelection)} className={enableSelection ? normalButtonClass : activeButtonClass} aria-label='Pan mode'>
                <HugeiconsIcon
                  icon={enableSelection ? Hold01Icon : Hold02Icon}
                  className='size-4 shrink-0'
                  strokeWidth={2}
                />
              </Button>
            </TooltipTrigger>
            <TooltipContent side='bottom' sideOffset={10}>{tooltipCopy.pan}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant={null} size='icon' onClick={() => setEnableSelection(!enableSelection)} className={enableSelection ? activeButtonClass : normalButtonClass} aria-label='Selection mode'>
                <HugeiconsIcon icon={Cursor02Icon} className='size-4 shrink-0' strokeWidth={2} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side='bottom' sideOffset={10}>{tooltipCopy.select}</TooltipContent>
          </Tooltip>

          <Separator orientation="vertical" className='md:!h-6 hidden md:block' />

          <DropdownMenu open={openShapeMenu} onOpenChange={setOpenShapeMenu}>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button variant={null} className={normalButtonClass} size='icon' aria-label='Add shape'>
                    <div className='flex flex-col items-center gap-0.5 relative'>
                      <HugeiconsIcon icon={SquareIcon} className='size-4 shrink-0' strokeWidth={2} />
                      <ChevronDown className='absolute inset-x-0 -bottom-3.5 w-3 h-3 text-muted-foreground' />
                    </div>
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent side='bottom' sideOffset={10}>{tooltipCopy.shape}</TooltipContent>
            </Tooltip>
            <DropdownMenuContent align='center' side='bottom' sideOffset={8} className='min-w-[180px]'>
              {shapeOptions.map(option => (
                <DropdownMenuItem key={option.nodeType} onSelect={() => onAddNode({ nodeType: option.nodeType })} className='gap-2 text-sm'>
                  {option.icon}
                  <span>{option.label}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant={null} className={normalButtonClass} size='icon' onClick={onAddLine} aria-label='Add connector'>
                <HugeiconsIcon icon={ArrowMoveDownRightIcon} className='size-4 shrink-0' strokeWidth={2} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side='bottom' sideOffset={10}>{tooltipCopy.connector}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant={null} className={normalButtonClass} size='icon' onClick={() => onAddNode({ nodeType: 'text' })} aria-label='Add point text'>
                <HugeiconsIcon icon={TextIcon} className='size-4 shrink-0' strokeWidth={2} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side='bottom' sideOffset={10}>{tooltipCopy.text}</TooltipContent>
          </Tooltip>

          <Separator orientation="vertical" className='md:!h-6 hidden md:block' />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={null}
                className={chatOpen ? activeButtonClass : normalButtonClass}
                size='icon'
                onClick={() => setOpenChatDialog(!chatOpen)}
                aria-label='Open assistant'
                disabled={!boardId}
              >
                <BotMessageSquare className='size-4 shrink-0 text-sidebar-icon-4' strokeWidth={2} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side='bottom' sideOffset={10}>{tooltipCopy.assistant}</TooltipContent>
          </Tooltip>

          <Separator orientation="vertical" className='md:!h-6 hidden md:block' />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={null}
                className={slidesPanelOpen ? activeButtonClass : normalButtonClass}
                size='icon'
                onClick={onToggleSlidesPanel}
                aria-label='Slides'
                disabled={!boardId}
              >
                <HugeiconsIcon icon={BitcoinPresentationIcon} className='size-4 shrink-0' strokeWidth={2} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side='bottom' sideOffset={10}>{tooltipCopy.slides}</TooltipContent>
          </Tooltip>

          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button variant={null} className={normalButtonClass} size='icon' aria-label='More actions'>
                    <HugeiconsIcon icon={MoreHorizontalIcon} className='size-4 shrink-0' strokeWidth={2} />
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent side='bottom' sideOffset={10}>{tooltipCopy.more}</TooltipContent>
            </Tooltip>
            <DropdownMenuContent align='end' side='bottom' sideOffset={8} className='min-w-[190px]'>
              <DropdownMenuItem onSelect={() => setOpenIconSearch(true)} className='gap-2 text-sm'>
                <HugeiconsIcon icon={GeometricShapes01Icon} className='size-4 shrink-0' strokeWidth={2} />
                <span>Icons</span>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setOpenImageSearch(true)} className='gap-2 text-sm'>
                <HugeiconsIcon icon={Image02Icon} className='size-4 shrink-0' strokeWidth={2} />
                <span>Images</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => {
                  if (isAtMaxFolderDepth) return
                  onAddNode({ nodeType: 'folder' })
                }}
                className={clsx('gap-2 text-sm', isAtMaxFolderDepth && 'opacity-50')}
              >
                <HugeiconsIcon icon={FolderAddIcon} className='size-4 shrink-0' strokeWidth={2} />
                <span>Folder</span>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setOpenDocumentUpload(true)} className='gap-2 text-sm' disabled={!boardId || documentUploadLimited}>
                <HugeiconsIcon icon={GoogleDocIcon} className='size-4 shrink-0' strokeWidth={2} />
                <span>Document</span>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setOpenAiSpark(true)} className='gap-2 text-sm' disabled={!boardId}>
                <Sparkles className='size-4 shrink-0 text-secondary' strokeWidth={2} />
                <span>AI actions</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      )}

      {viewMode === 'linear' && (
        <>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={null}
                className={normalButtonClass}
                size='icon'
                onClick={() => onAddNode({ nodeType: 'sheet' })}
                aria-label='Add sticky note'
              >
                <HugeiconsIcon icon={Note02Icon} className='size-4 shrink-0' strokeWidth={2} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side='bottom' sideOffset={10}>{tooltipCopy.note}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={null}
                className={clsx(normalButtonClass, isAtMaxFolderDepth && 'opacity-50')}
                size='icon'
                aria-disabled={isAtMaxFolderDepth}
                onClick={() => {
                  if (isAtMaxFolderDepth) return
                  onAddNode({ nodeType: 'folder' })
                }}
                aria-label='Add folder'
              >
                <HugeiconsIcon icon={FolderAddIcon} className='size-4 shrink-0' strokeWidth={2} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side='bottom' sideOffset={10}>{tooltipCopy.folder}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={null}
                className={clsx(normalButtonClass, documentUploadLimited && 'opacity-50')}
                size='icon'
                onClick={() => setOpenDocumentUpload(true)}
                aria-label='Upload document'
                disabled={!boardId || documentUploadLimited}
              >
                <HugeiconsIcon icon={GoogleDocIcon} className='size-4 shrink-0' strokeWidth={2} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side='bottom' sideOffset={10}>{tooltipCopy.document}</TooltipContent>
          </Tooltip>
        </>
      )}

      <Separator orientation="vertical" className='md:!h-6 hidden md:block' />

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={null}
            className={isPublicShared ? activeButtonClass : normalButtonClass}
            size='icon'
            onClick={() => setOpenShareDialog(true)}
            aria-label='Share board'
            disabled={!boardId}
          >
            <HugeiconsIcon icon={Share08Icon} className='size-4 shrink-0' strokeWidth={2} />
          </Button>
        </TooltipTrigger>
        <TooltipContent side='bottom' sideOffset={10}>{tooltipCopy.share}</TooltipContent>
      </Tooltip>

      <Dialog open={openShareDialog} onOpenChange={setOpenShareDialog}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>Share board</DialogTitle>
            <DialogDescription>
              Public sharing lets anyone with the link view this board.
            </DialogDescription>
          </DialogHeader>
          <div className='space-y-3'>
            <Button
              variant={isPublicShared ? 'outline' : 'default'}
              className='w-full'
              onClick={handleTogglePublicShare}
              disabled={!boardId || isUpdatingSharing}
            >
              {isUpdatingSharing
                ? 'Updating...'
                : isPublicShared
                  ? 'Disable public sharing'
                  : 'Enable public sharing'}
            </Button>
            {isPublicShared ? (
              <Button
                variant='outline'
                className='w-full'
                onClick={handleCopyShareLink}
              >
                Copy public link
              </Button>
            ) : null}
            {shareError ? (
              <p className='text-xs text-destructive'>{shareError}</p>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
})
