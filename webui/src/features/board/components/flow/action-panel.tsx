import { memo, useEffect, useState } from 'react'
import type { AddNoteNodeOptions } from '../../hooks/use-add-node'
import { ImageSearchDialog } from './utils/image-search'
import { IconSearchDialog } from './utils/icon-search'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { Chat } from '@/features/agent/components/chat-view'
import { useGraphStore } from '../../store/graph-store'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { useBoardShortcuts } from '../../hooks/use-board-shortcuts'
import { DocumentUploadDialog } from './utils/document-upload'
import { AiSparkDialog } from './utils/ai-spark-dialog'
import { NavigatePanel } from './navigate-panel'
import { ToolPanel } from './tool-panel'
import { Button } from '@/components/ui/button'
import { HugeiconsIcon } from '@hugeicons/react'
import { LinkSquare01Icon } from '@hugeicons/core-free-icons'
import { BotMessageSquare, ChevronRight } from 'lucide-react'
import { SlidePanel } from './slide-panel'


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

  viewMode: ViewMode
  setViewMode: (mode: ViewMode) => void
}

/**
 * Action panel orchestrator for tools + navigation controls.
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
  const [openSlidesPanel, setOpenSlidesPanel] = useState(false)
  const boardId = useGraphStore(state => state.boardId)
  const nodes = useGraphStore(state => state.nodes)
  const setNodes = useGraphStore(state => state.setNodes)
  const setViewSlides = useGraphStore(state => state.setViewSlides)
  const presentationMode = useGraphStore(state => state.presentationMode)
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

  useEffect(() => {
    setViewSlides(openSlidesPanel)
  }, [openSlidesPanel, setViewSlides])

  useEffect(() => {
    setNodes(ns =>
      ns.map(n => {
        if (n.data?.style?.type !== 'slide') return n
        return {
          ...n,
          style: { ...(n.style ?? {}), pointerEvents: openSlidesPanel ? 'auto' : 'none' },
          dragHandle: '.slide-handle',
        }
      })
    )
  }, [openSlidesPanel, setNodes])

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
      { key: 'm', handler: () => boardId && setOpenSlidesPanel(true) },
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
    <>
      {!presentationMode && (
        <>
          <NavigatePanel
            enableSelection={enableSelection}
            setEnableSelection={setEnableSelection}
            onZoomIn={onZoomIn}
            onZoomOut={onZoomOut}
            onFitView={onFitView}
            onResetZoom={onResetZoom}
            isLocked={isLocked}
            toggleLock={toggleLock}
            viewMode={viewMode}
            setViewMode={setViewMode}
            zoom={zoom}
            undo={undo}
            redo={redo}
            canUndo={canUndo}
            canRedo={canRedo}
            onToggleSlidesPanel={() => setOpenSlidesPanel(v => !v)}
            slidesPanelOpen={openSlidesPanel}
          />

          <ToolPanel
            onAddNode={onAddNode}
            onAddLine={onAddLine}
            viewMode={viewMode}
            openShapeMenu={openShapeMenu}
            setOpenShapeMenu={setOpenShapeMenu}
            setOpenIconSearch={setOpenIconSearch}
            setOpenImageSearch={setOpenImageSearch}
            setOpenDocumentUpload={setOpenDocumentUpload}
            setOpenChatDialog={setOpenChatDialog}
            chatOpen={openChatDialog}
            setOpenAiSpark={setOpenAiSpark}
            boardId={boardId}
          />
        </>
      )}

      <ImageSearchDialog openImageSearch={openImageSearch} setOpenImageSearch={setOpenImageSearch} />
      <IconSearchDialog openIconSearch={openIconSearch} setOpenIconSearch={setOpenIconSearch} />
      <DocumentUploadDialog open={openDocumentUpload} onOpenChange={setOpenDocumentUpload} />
      <AiSparkDialog
        open={openAiSpark}
        onOpenChange={setOpenAiSpark}
        boardId={boardId}
        selectedNodes={nodes.filter(n => n.selected && (n.data as { kind?: string } | undefined)?.kind !== 'point')}
      />
      <Sheet open={openSlidesPanel} onOpenChange={setOpenSlidesPanel} modal={false}>
        <SheetContent
          side="right"
          showOverlay={false}
          showClose={false}
          onInteractOutside={(event) => event.preventDefault()}
          className="w-[360px] max-w-[92vw] bg-sidebar text-sidebar-foreground border-l border-border p-0"
        >
          <SlidePanel onClose={() => setOpenSlidesPanel(false)} />
        </SheetContent>
      </Sheet>
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
    </>
  )
})
