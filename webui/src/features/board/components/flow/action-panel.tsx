import { memo, useEffect, useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { CircleIcon, Cursor02Icon, DiamondIcon, FitToScreenIcon, Hold04Icon, LeftToRightListBulletIcon, MinusSignIcon, Note02Icon, PlusSignIcon, SquareIcon, SquareLock02Icon, SquareUnlock02Icon, TextIcon, Image02Icon, ChartBubble02Icon, GeometricShapes01Icon, Tag01Icon, LinkSquare01Icon, LabelIcon, ArrowMoveDownRightIcon, GoogleDocIcon, Undo03Icon, Redo03Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import clsx from 'clsx'
import type { AddNoteNodeOptions } from '../../hooks/use-add-node'
import { Separator } from '@/components/ui/separator'
import { ImageSearchDialog } from './utils/image-search'
import { IconSearchDialog } from './utils/icon-search'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { BotMessageSquare, ChevronDown, ChevronRight, Cloud, Layers, Sparkles } from 'lucide-react'
import type { NodeType } from '../../types/style'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { Chat } from '@/features/agent/components/chat-view'
import { useGraphStore } from '../../store/graph-store'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { useBoardShortcuts } from '../../hooks/use-board-shortcuts'
import { DocumentUploadDialog } from './utils/document-upload'
import { AiSparkDialog } from './utils/ai-spark-dialog'

type ViewMode = 'graph' | 'linear'

interface ActionPanelProps {
  onAddNode: (options: AddNoteNodeOptions) => void
  onAddLine: () => void
  enableSelection: boolean
  setEnableSelection: (mode: boolean) => void

  // React Flow controls
  onZoomIn: () => void
  onZoomOut: () => void
  onFitView: () => void
  onResetZoom: () => void
  isLocked: boolean
  toggleLock: () => void

  // NEW
  viewMode: ViewMode
  setViewMode: (mode: ViewMode) => void
}


/**
 * Action panel component for graph controls and node additions.
 */
export const ActionPanel = memo(function ActionPanel({
  onAddNode,
  onAddLine,
  enableSelection,
  setEnableSelection,
  onZoomIn,
  onZoomOut,
  onFitView,
  onResetZoom,
  isLocked,
  toggleLock,
  viewMode,
  setViewMode
}: ActionPanelProps) {
  const [openImageSearch, setOpenImageSearch] = useState(false)
  const [openIconSearch, setOpenIconSearch] = useState(false)
  const [openChatDialog, setOpenChatDialog] = useState(false)
  const [openShapeMenu, setOpenShapeMenu] = useState(false)
  const [openDocumentUpload, setOpenDocumentUpload] = useState(false)
  const [openAiSpark, setOpenAiSpark] = useState(false)
  const boardId = useGraphStore(state => state.boardId)
  const nodes = useGraphStore(state => state.nodes)
  const zoom = useGraphStore(state => state.zoom ?? 1)
  const undo = useGraphStore(state => state.undo)
  const redo = useGraphStore(state => state.redo)
  const canUndo = useGraphStore(state => state.historyPast.length > 0)
  const canRedo = useGraphStore(state => state.historyFuture.length > 0)
  const navigate = useNavigate()
  const boardSearch = useSearch({
    from: "/boards/$id",
    select: (s: { current_chat_id?: string }) => ({ currentChatId: s.current_chat_id }),
    shouldThrow: false,
  })
  const currentChatId = boardSearch?.currentChatId

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

  const activeButtonClass = clsx(
    normalButtonClass,
    'bg-sidebar-primary text-secondary',
  )

  const selectionModeButtonClass = enableSelection ? activeButtonClass : normalButtonClass
  const dragModeButtonClass = enableSelection ? normalButtonClass : activeButtonClass

  const ModeButton = ({ mode, label, children }: { mode: ViewMode; label: string; children: React.ReactNode }) => {
    const active = viewMode === mode
    const [small, setSmall] = useState(false)

    useEffect(() => {
      const check = () => setSmall(window.innerWidth < 640)
      check()
      window.addEventListener('resize', check)
      return () => window.removeEventListener('resize', check)
    }, [])

    const size = small ? 'icon' : 'default'

    return (
      <Button
        variant={null}
        size={size}
        onClick={() => setViewMode(mode)}
        className={active ? activeButtonClass : normalButtonClass}
        title={`${label} view`}
        aria-label={`${label} view`}
        aria-pressed={active}
      >
        {children}
      </Button>
    )
  }

  const ShortcutHint = ({ label }: { label: string }) => (
    <span className='pointer-events-none absolute -bottom-1 -right-1 text-[9px] leading-none text-muted-foreground/80'>
      {label}
    </span>
  )

  const MenuShortcutHint = ({ label }: { label?: string }) => {
    if (!label) return null
    return (
      <span className='pointer-events-none absolute -bottom-1 -right-1 text-[9px] leading-none text-muted-foreground/80'>
        {label}
      </span>
    )
  }

  useBoardShortcuts({
    enabled: viewMode === 'graph',
    shortcuts: [
      { key: 'a', handler: onAddLine },
      { key: 'n', handler: () => onAddNode({ nodeType: 'sheet' }) },
      { key: 's', handler: () => setOpenShapeMenu(true) },
      { key: 'r', handler: () => onAddNode({ nodeType: 'rectangle' }) },
      { key: 'o', handler: () => onAddNode({ nodeType: 'ellipse' }) },
      { key: 'd', handler: () => onAddNode({ nodeType: 'diamond' }) },
      { key: 't', handler: () => onAddNode({ nodeType: 'text' }) },
      { key: 'g', handler: () => setOpenIconSearch(true) },
      { key: 'i', handler: () => setOpenImageSearch(true) },
      { key: 'c', handler: () => boardId && setOpenChatDialog(true) },
      { key: 'b', handler: () => boardId && setOpenAiSpark(true) },
      { key: 'p', handler: () => setEnableSelection(false) },
      { key: 'v', handler: () => setEnableSelection(!enableSelection) },
      { key: 'l', handler: toggleLock },
      { key: 'f', handler: onFitView },
      { key: '=', handler: onZoomIn },
      { key: '+', handler: onZoomIn },
      { key: '-', handler: onZoomOut },
      { key: '_', handler: onZoomOut },
      { key: '0', handler: onResetZoom },
    ],
  })

  return (
    <div
      className={`
        absolute z-50 border border-border shadow-md
        backdrop-blur-md supports-[backdrop-filter]:bg-sidebar/80 backdrop-saturate-150
        bg-sidebar text-sidebar-foreground rounded-xl
        p-1 flex gap-1
        right-2 top-1/2 -translate-y-1/2 md:translate-y-0
        flex-col items-stretch
        md:right-auto md:left-1/2 md:top-2 md:-translate-x-1/2
        md:flex-row md:items-center
      `}
      role='toolbar'
      aria-label='Graph actions'
    >
      {/* View mode toggle */}
      <ModeButton mode='graph' label='Graph'>
        <HugeiconsIcon icon={ChartBubble02Icon} className='size-4 shrink-0' strokeWidth={2} />
        <span className='text-xs font-medium sr-only sm:not-sr-only'>Graph</span>
      </ModeButton>

      <ModeButton mode='linear' label='Linear'>
        <HugeiconsIcon icon={LeftToRightListBulletIcon} className='size-4 shrink-0' strokeWidth={2} />
        <span className='text-xs font-medium sr-only sm:not-sr-only'>List</span>
      </ModeButton>

      <Separator orientation="vertical" className='md:!h-6 hidden md:block' />

      {/* -- GRAPH MODE CONTROLS -- */}
      {viewMode === 'graph' && (
        <>
          {/* Pan / Select modes */}
          <Button
            variant={null}
            size='icon'
            onClick={() => setEnableSelection(!enableSelection)}
            className={dragModeButtonClass}
            title='Pan mode'
            aria-label='Pan mode'
          >
            <span className='relative inline-flex items-center justify-center'>
              <HugeiconsIcon icon={Hold04Icon} className='size-4 shrink-0' />
              <ShortcutHint label='P' />
            </span>
          </Button>
          <Button
            variant={null}
            size='icon'
            onClick={() => setEnableSelection(!enableSelection)}
            className={selectionModeButtonClass}
            title='Selection mode'
            aria-label='Selection mode'
          >
            <span className='relative inline-flex items-center justify-center'>
              <HugeiconsIcon icon={Cursor02Icon} className='size-4 shrink-0' strokeWidth={2} />
              <ShortcutHint label='V' />
            </span>
          </Button>

          {/* Undo / Redo */}
          <Button
            variant={null}
            size='icon'
            onClick={undo}
            className={normalButtonClass}
            title='Undo'
            aria-label='Undo'
            disabled={!canUndo}
          >
            <span className='relative inline-flex items-center justify-center'>
              <HugeiconsIcon icon={Undo03Icon} className='size-4 shrink-0' strokeWidth={2} />
              <ShortcutHint label='Z' />
            </span>
          </Button>
          <Button
            variant={null}
            size='icon'
            onClick={redo}
            className={normalButtonClass}
            title='Redo'
            aria-label='Redo'
            disabled={!canRedo}
          >
            <span className='relative inline-flex items-center justify-center'>
              <HugeiconsIcon icon={Redo03Icon} className='size-4 shrink-0' strokeWidth={2} />
              <ShortcutHint label='Y' />
            </span>
          </Button>

          {/* Zoom controls */}
          <Button
            variant={null}
            size='icon'
            onClick={onZoomIn}
            className={normalButtonClass}
            title='Zoom in'
            aria-label='Zoom in'
          >
            <span className='relative inline-flex items-center justify-center'>
              <HugeiconsIcon icon={PlusSignIcon} className='size-4 shrink-0' strokeWidth={2} />
              <ShortcutHint label='+' />
            </span>
          </Button>
          <Button
            variant={null}
            size='icon'
            onClick={onZoomOut}
            className={normalButtonClass}
            title='Zoom out'
            aria-label='Zoom out'
          >
            <span className='relative inline-flex items-center justify-center'>
              <HugeiconsIcon icon={MinusSignIcon} className='size-4 shrink-0' strokeWidth={2} />
              <ShortcutHint label='-' />
            </span>
          </Button>
          <Button
            variant={null}
            size='icon'
            onClick={onResetZoom}
            className={normalButtonClass}
            title='Reset zoom to 100%'
            aria-label='Reset zoom to 100%'
          >
            <span className='relative inline-flex items-center justify-center text-xs font-medium text-secondary'>
              {Math.round((zoom || 1) * 100)}%
              <ShortcutHint label='0' />
            </span>
          </Button>
          <Button
            variant={null}
            size='icon'
            onClick={onFitView}
            className={normalButtonClass}
            title='Fit view'
            aria-label='Fit view'
          >
            <span className='relative inline-flex items-center justify-center'>
              <HugeiconsIcon icon={FitToScreenIcon} className='size-4 shrink-0' strokeWidth={2} />
              <ShortcutHint label='F' />
            </span>
          </Button>

          {/* Lock / Unlock canvas */}
          <Button
            variant={null}
            size='icon'
            onClick={toggleLock}
            className={isLocked ? activeButtonClass : normalButtonClass}
            title={isLocked ? 'Unlock canvas' : 'Lock canvas'}
            aria-pressed={isLocked}
            aria-label={isLocked ? 'Unlock canvas' : 'Lock canvas'}
          >
            <span className='relative inline-flex items-center justify-center'>
              {isLocked ? (
                <HugeiconsIcon icon={SquareLock02Icon} className='size-4 shrink-0' strokeWidth={2} />
              ) : (
                <HugeiconsIcon icon={SquareUnlock02Icon} className='size-4 shrink-0' strokeWidth={2} />
              )}
              <ShortcutHint label='L' />
            </span>
          </Button>

          <Separator orientation="vertical" className='md:!h-6 hidden md:block' />

          {/* Add sheet */}
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

          {/* Add line */}
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

          {/* Shape picker */}
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

          {/* Add text */}
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

          {/* Icon search */}
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

          {/* Image search */}
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

          {/* Upload document */}
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

          {/* AI Spark */}
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

          {/* Open Chat */}
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
        </>
      )}

      {/* -- LINEAR MODE CONTROLS -- */}
      {viewMode !== "graph" && (
        <>
          {/* Keep it simple in linear: only Add sheet */}
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

      {/* Dialogs */}
      <ImageSearchDialog openImageSearch={openImageSearch} setOpenImageSearch={setOpenImageSearch} />
      <IconSearchDialog openIconSearch={openIconSearch} setOpenIconSearch={setOpenIconSearch} />
      <DocumentUploadDialog open={openDocumentUpload} onOpenChange={setOpenDocumentUpload} />
      <AiSparkDialog
        open={openAiSpark}
        onOpenChange={setOpenAiSpark}
        boardId={boardId}
        selectedNodes={nodes.filter(n => n.selected && (n.data as { kind?: string } | undefined)?.kind !== 'point')}
      />
      <Sheet open={openChatDialog} onOpenChange={setOpenChatDialog} modal={false}>
        <SheetContent
          side="right"
          showOverlay={false}
          showClose={false}
          onInteractOutside={(event) => event.preventDefault()}
          className="w-[420px] max-w-[92vw] bg-sidebar text-sidebar-foreground border-l border-border p-0"
        >
          <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-3 bg-sidebar">
            <div className="flex items-center gap-2 text-sm font-medium">
              <BotMessageSquare className="size-4 text-sidebar-icon-4" strokeWidth={2} />
              Board Copilot
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setOpenChatDialog(false)
                  if (currentChatId) {
                    navigate({ to: "/chats/$id", params: { id: currentChatId } })
                  } else {
                    navigate({ to: "/chats" })
                  }
                }}
                title="Open full chat view"
                aria-label="Open full chat view"
              >
                <HugeiconsIcon icon={LinkSquare01Icon} className="size-4" strokeWidth={2} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setOpenChatDialog(false)}
                title="Close"
                aria-label="Close"
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
          <div className="flex-1 relative bg-sidebar overflow-y-auto scrollbar-thin">
            {boardId ? (
              <Chat
                initialBoardId={boardId}
                className="relative"
                showHistoricalChats
                chatId={currentChatId}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-sm text-muted-foreground">
                Select a board to start a conversation.
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
})
