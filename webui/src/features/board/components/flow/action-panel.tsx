import { memo, useEffect, useState } from 'react'
import type { AddNoteNodeOptions } from '../../hooks/use-add-node'
import { ImageSearchDialog } from './utils/image-search'
import { IconSearchDialog } from './utils/icon-search'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useGraphStore } from '../../store/graph-store'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { useBoardShortcuts } from '../../hooks/use-board-shortcuts'
import { DocumentUploadDialog } from './utils/document-upload'
import { AiSparkDialog } from './utils/ai-spark-dialog'
import { TopBar } from './top-bar'
import { SlidePanel } from './slide-panel'
import { CopilotSheet } from './copilot-sheet'


type ViewMode = 'graph' | 'linear'

interface ActionPanelProps {
  onAddNode: (options: AddNoteNodeOptions) => void
  onAddLine: () => void
  enableSelection: boolean
  setEnableSelection: (mode: boolean) => void

  // React Flow controls
  onZoomIn: () => void
  onZoomOut: () => void
  onResetZoom: () => void
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
  onResetZoom,
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
        <TopBar
          onAddNode={onAddNode}
          onAddLine={onAddLine}
          viewMode={viewMode}
          setViewMode={setViewMode}
          enableSelection={enableSelection}
          setEnableSelection={setEnableSelection}
          openShapeMenu={openShapeMenu}
          setOpenShapeMenu={setOpenShapeMenu}
          setOpenIconSearch={setOpenIconSearch}
          setOpenImageSearch={setOpenImageSearch}
          setOpenDocumentUpload={setOpenDocumentUpload}
          setOpenChatDialog={setOpenChatDialog}
          chatOpen={openChatDialog}
          setOpenAiSpark={setOpenAiSpark}
          onToggleSlidesPanel={() => setOpenSlidesPanel(v => !v)}
          slidesPanelOpen={openSlidesPanel}
          boardId={boardId}
        />
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
          <SheetHeader className='sr-only'>
            <SheetTitle>Slides</SheetTitle>
          </SheetHeader>
          <SlidePanel onClose={() => setOpenSlidesPanel(false)} />
        </SheetContent>
      </Sheet>
      <CopilotSheet
        open={openChatDialog}
        onOpenChange={setOpenChatDialog}
        boardId={boardId}
        currentChatId={currentChatId}
        onOpenFullChat={(chatId) => {
          setOpenChatDialog(false)
          if (chatId) {
            navigate({
              to: "/chats/$id",
              params: { id: chatId },
              search: (prev: Record<string, unknown>) => ({
                ...prev,
                board_id: boardId || undefined,
              }),
            })
          } else {
            navigate({
              to: "/chats",
              search: (prev: Record<string, unknown>) => ({
                ...prev,
                board_id: boardId || undefined,
              }),
            })
          }
        }}
      />
    </>
  )
})
