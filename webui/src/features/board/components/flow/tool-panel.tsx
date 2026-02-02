import { memo, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  ArrowMoveDownRightIcon,
  CircleIcon,
  DiamondIcon,
  GeometricShapes01Icon,
  GoogleDocIcon,
  Image02Icon,
  LabelIcon,
  Note02Icon,
  SquareIcon,
  Tag01Icon,
  TextIcon,
  BitcoinPresentationIcon,
} from '@hugeicons/core-free-icons'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { BotMessageSquare, ChevronDown, Cloud, Layers, Sparkles } from 'lucide-react'
import type { AddNoteNodeOptions } from '../../hooks/use-add-node'
import type { NodeType } from '../../types/style'

type ViewMode = 'graph' | 'linear'

export interface ToolPanelProps {
  onAddNode: (options: AddNoteNodeOptions) => void
  onAddLine: () => void
  viewMode: ViewMode
  openShapeMenu: boolean
  setOpenShapeMenu: (open: boolean) => void
  setOpenIconSearch: (open: boolean) => void
  setOpenImageSearch: (open: boolean) => void
  setOpenDocumentUpload: (open: boolean) => void
  setOpenChatDialog: (open: boolean) => void
  setOpenAiSpark: (open: boolean) => void
  setOpenSlidesPanel: (open: boolean) => void
  boardId?: string
}

export const ToolPanel = memo(function ToolPanel({
  onAddNode,
  onAddLine,
  viewMode,
  openShapeMenu,
  setOpenShapeMenu,
  setOpenIconSearch,
  setOpenImageSearch,
  setOpenDocumentUpload,
  setOpenChatDialog,
  setOpenAiSpark,
  setOpenSlidesPanel,
  boardId,
}: ToolPanelProps) {
  const handleAddShape = (nodeType: NodeType) => onAddNode({ nodeType })

  const shapeOptions: { nodeType: NodeType, label: string, icon: ReactNode, shortcut?: string }[] = [
    { nodeType: 'rectangle', label: 'Rectangle', icon: <HugeiconsIcon icon={SquareIcon} className='size-4 shrink-0' strokeWidth={2} />, shortcut: 'R' },
    { nodeType: 'layered-rectangle', label: 'Layered card', icon: <Layers className='w-4 h-4 shrink-0' /> },
    { nodeType: 'ellipse', label: 'Ellipse', icon: <HugeiconsIcon icon={CircleIcon} className='size-4 shrink-0' strokeWidth={2} />, shortcut: 'O' },
    { nodeType: 'diamond', label: 'Diamond', icon: <HugeiconsIcon icon={DiamondIcon} className='size-4 shrink-0' strokeWidth={2} />, shortcut: 'D' },
    { nodeType: 'soft-diamond', label: 'Double diamond', icon: <HugeiconsIcon icon={DiamondIcon} className='size-4 shrink-0' strokeWidth={2} /> },
    { nodeType: 'layered-diamond', label: 'Layered diamond', icon: <Layers className='w-4 h-4 shrink-0' /> },
    { nodeType: 'layered-circle', label: 'Layered circle', icon: <HugeiconsIcon icon={CircleIcon} className='size-4 shrink-0' strokeWidth={2} /> },
    { nodeType: 'tag', label: 'Tag', icon: <HugeiconsIcon icon={LabelIcon} className='size-4 shrink-0' strokeWidth={2} /> },
    { nodeType: 'thought-cloud', label: 'Cloud', icon: <Cloud className='w-4 h-4 shrink-0' /> },
    { nodeType: 'capsule', label: 'Capsule', icon: <HugeiconsIcon icon={Tag01Icon} className='size-4 shrink-0' strokeWidth={2} /> },
  ]

  const normalButtonClass = `
    transition-colors
    text-card-foreground
    hover:bg-sidebar-primary hover:text-sidebar-primary-foreground
    p-4
    rounded-lg
    flex flex-row items-center justify-center gap-2
  `

  const MenuShortcutHint = ({ label }: { label?: string }) => {
    if (!label) return null
    return (
      <span className='pointer-events-none absolute -bottom-1 -right-1 text-[9px] leading-none text-muted-foreground/80'>
        {label}
      </span>
    )
  }

  const ShortcutHint = ({ label }: { label: string }) => (
    <span className='pointer-events-none absolute -bottom-1 -right-1 text-[9px] leading-none text-muted-foreground/80'>
      {label}
    </span>
  )

  return (
    <div
      className={`
        absolute z-50 border border-border shadow-md
        backdrop-blur-md supports-[backdrop-filter]:bg-sidebar/80 backdrop-saturate-150
        bg-sidebar text-sidebar-foreground rounded-xl
        p-1 flex gap-1
        left-1/2 bottom-2 -translate-x-1/2
        flex-row items-center
      `}
      role='toolbar'
      aria-label='Tools'
    >
      {viewMode === 'graph' && (
        <>
          <Button
            variant={null}
            className={normalButtonClass}
            size='icon'
            onClick={() => onAddNode({ nodeType: 'sheet' })}
            title='Add Sticky Note'
            aria-label='Add Sticky Note'
          >
            <span className='relative inline-flex items-center justify-center'>
              <HugeiconsIcon icon={Note02Icon} className='size-4 shrink-0' strokeWidth={2} />
              <ShortcutHint label='N' />
            </span>
          </Button>

          <Button
            variant={null}
            className={normalButtonClass}
            size='icon'
            onClick={() => setOpenSlidesPanel(true)}
            title='Slides'
            aria-label='Slides'
          >
            <span className='relative inline-flex items-center justify-center'>
              <HugeiconsIcon icon={BitcoinPresentationIcon} className='size-4 shrink-0' strokeWidth={2} />
            </span>
          </Button>

          <Button
            variant={null}
            className={normalButtonClass}
            size='icon'
            onClick={onAddLine}
            title='Add line'
            aria-label='Add line'
          >
            <span className='relative inline-flex items-center justify-center'>
              <HugeiconsIcon icon={ArrowMoveDownRightIcon} className='size-4 shrink-0' strokeWidth={2} />
              <ShortcutHint label='A' />
            </span>
          </Button>

          <DropdownMenu open={openShapeMenu} onOpenChange={setOpenShapeMenu}>
            <DropdownMenuTrigger asChild>
              <Button
                variant={null}
                className={normalButtonClass}
                size='icon'
                title='Add shape'
                aria-label='Add shape'
              >
                <div className='flex flex-col items-center gap-0.5 relative'>
                  <HugeiconsIcon icon={SquareIcon} className='size-4 shrink-0' strokeWidth={2} />
                  <ChevronDown className='absolute inset-x-0 -bottom-3.5 w-3 h-3 text-muted-foreground' />
                  <ShortcutHint label='S' />
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align='center'
              side='bottom'
              sideOffset={8}
              className='min-w-[180px]'
              onKeyDown={(event) => {
                const key = event.key.toLowerCase()
                if (key === 'escape') {
                  event.preventDefault()
                  setOpenShapeMenu(false)
                  return
                }
                if (key === 'r' || key === 'o' || key === 'd') {
                  event.preventDefault()
                  const nextType =
                    key === 'r'
                      ? 'rectangle'
                      : key === 'o'
                        ? 'ellipse'
                        : 'diamond'
                  handleAddShape(nextType)
                  setOpenShapeMenu(false)
                }
              }}
            >
              {shapeOptions.map(option => (
                <DropdownMenuItem
                  key={option.nodeType}
                  onSelect={() => handleAddShape(option.nodeType)}
                  className='gap-2 text-sm'
                >
                  <span className='relative inline-flex items-center justify-center'>
                    {option.icon}
                    <MenuShortcutHint label={option.shortcut} />
                  </span>
                  <span>{option.label}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant={null}
            className={normalButtonClass}
            size='icon'
            onClick={() => onAddNode({ nodeType: 'text' })}
            title='Add Text'
            aria-label='Add Text'
          >
            <span className='relative inline-flex items-center justify-center'>
              <HugeiconsIcon icon={TextIcon} className='size-4 shrink-0' strokeWidth={2} />
              <ShortcutHint label='T' />
            </span>
          </Button>

          <Button
            variant={null}
            className={normalButtonClass}
            size='icon'
            onClick={() => setOpenIconSearch(true)}
            title='Search icons'
            aria-label='Search icons'
          >
            <span className='relative inline-flex items-center justify-center'>
              <HugeiconsIcon icon={GeometricShapes01Icon} className='size-4 shrink-0' strokeWidth={2} />
              <ShortcutHint label='G' />
            </span>
          </Button>

          <Button
            variant={null}
            className={normalButtonClass}
            size='icon'
            onClick={() => setOpenImageSearch(true)}
            title='Search images'
            aria-label='Search images'
          >
            <span className='relative inline-flex items-center justify-center'>
              <HugeiconsIcon icon={Image02Icon} className='size-4 shrink-0' strokeWidth={2} />
              <ShortcutHint label='I' />
            </span>
          </Button>

          <Button
            variant={null}
            className={normalButtonClass}
            size='icon'
            onClick={() => setOpenDocumentUpload(true)}
            title='Upload document'
            aria-label='Upload document'
            disabled={!boardId}
          >
            <span className='relative inline-flex items-center justify-center'>
              <HugeiconsIcon icon={GoogleDocIcon} className='size-4 shrink-0' strokeWidth={2} />
              <ShortcutHint label='P' />
            </span>
          </Button>

          <Button
            variant={null}
            className={normalButtonClass}
            size='icon'
            onClick={() => setOpenChatDialog(true)}
            title='Open Chat'
            aria-label='Open Chat'
            disabled={!boardId}
          >
            <span className='relative inline-flex items-center justify-center'>
              <BotMessageSquare className='size-4 shrink-0 text-sidebar-icon-4' strokeWidth={2} />
              <ShortcutHint label='C' />
            </span>
          </Button>

          <Button
            variant={null}
            className={normalButtonClass}
            size='icon'
            onClick={() => setOpenAiSpark(true)}
            title='AI Spark'
            aria-label='AI Spark'
            disabled={!boardId}
          >
            <span className='relative inline-flex items-center justify-center'>
              <Sparkles className='size-4 shrink-0 text-secondary' strokeWidth={2} />
              <ShortcutHint label='B' />
            </span>
          </Button>
        </>
      )}

      {viewMode !== "graph" && (
        <>
          <Button
            variant={null}
            className={normalButtonClass}
            size='icon'
            onClick={() => onAddNode({ nodeType: 'sheet' })}
            title='Add Sticky Note'
            aria-label='Add Sticky Note'
          >
            <HugeiconsIcon icon={Note02Icon} className='size-4 shrink-0' strokeWidth={2} />
          </Button>
        </>
      )}

    </div>
  )
})
