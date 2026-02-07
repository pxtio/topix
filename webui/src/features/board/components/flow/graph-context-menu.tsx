import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactFlowProps } from '@xyflow/react'

import type { LinkEdge, NoteNode } from '../../types/flow'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  ArrowDown01Icon,
  ArrowRight01Icon,
  Blockchain06Icon,
  ChatTranslateIcon,
  GitForkIcon,
  Idea01Icon,
  LayerBringForwardIcon,
  LayerBringToFrontIcon,
  LayerSendBackwardIcon,
  LayerSendToBackIcon,
  ParagraphBulletsPoint01Icon,
  ReduceParagraphIcon,
  PaintBoardIcon,
} from '@hugeicons/core-free-icons'
import { Sparkles } from 'lucide-react'
import { useGraphStore } from '../../store/graph-store'
import { buildContextTextFromNodes } from '../../utils/context-text'
import { toast } from 'sonner'
import { useAiSparkActions } from '../../hooks/use-ai-spark-actions'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

/**
 * Props for the GraphContextMenu component.
 */
type GraphContextMenuProps = {
  nodes: NoteNode[]
  setNodesPersist: (updater: (prev: NoteNode[]) => NoteNode[]) => void
  children: (handlers: {
    onPaneContextMenu: NonNullable<ReactFlowProps<NoteNode, LinkEdge>['onPaneContextMenu']>
    onNodeContextMenu: NonNullable<ReactFlowProps<NoteNode, LinkEdge>['onNodeContextMenu']>
  }) => React.ReactNode
}

/**
 * A context menu for the graph that appears on right-clicking
 * selected nodes or the pane when nodes are selected.
 * Allows changing z-index and performing AI actions on selected nodes.
 */
export function GraphContextMenu({ nodes, setNodesPersist, children }: GraphContextMenuProps) {
  const [menuPosition, setMenuPosition] = useState<{ x: number, y: number } | null>(null)
  const [customLanguage, setCustomLanguage] = useState('')
  const [translateOpen, setTranslateOpen] = useState(false)

  const stats = useMemo(() => {
    let globalMin = Number.POSITIVE_INFINITY
    let globalMax = Number.NEGATIVE_INFINITY
    let selectedMin = Number.POSITIVE_INFINITY
    let selectedMax = Number.NEGATIVE_INFINITY
    const selectedSet = new Set<string>()

    for (const node of nodes) {
      const kind = (node.data as { kind?: string } | undefined)?.kind
      const nodeType = (node.data as { style?: { type?: string } } | undefined)?.style?.type
      if (kind === 'point' || nodeType === 'slide') continue
      const z = node.zIndex ?? 0
      if (z < globalMin) globalMin = z
      if (z > globalMax) globalMax = z

      if (node.selected) {
        selectedSet.add(node.id)
        if (z < selectedMin) selectedMin = z
        if (z > selectedMax) selectedMax = z
      }
    }

    const hasSelection = selectedSet.size > 0

    return {
      selectedSet,
      hasSelection,
      globalMin: globalMin === Number.POSITIVE_INFINITY ? 0 : globalMin,
      globalMax: globalMax === Number.NEGATIVE_INFINITY ? 0 : globalMax,
      selectedMin: selectedMin === Number.POSITIVE_INFINITY ? 0 : selectedMin,
      selectedMax: selectedMax === Number.NEGATIVE_INFINITY ? 0 : selectedMax,
    }
  }, [nodes])

  const { selectedSet, hasSelection, globalMin, globalMax, selectedMin, selectedMax } = stats
  const canSendBackward = hasSelection && selectedMin > globalMin
  const canSendForward = hasSelection && selectedMax < globalMax
  const boardId = useGraphStore(state => state.boardId)
  const { actions: aiActions, processingKey, runAction } = useAiSparkActions()
  const aiMenuActions = useMemo(
    () => aiActions.filter(action => action.key !== 'translate'),
    [aiActions],
  )
  const positionTooltips = useMemo(() => ({
    sendBackward: "Move the selection one layer down.",
    sendForward: "Move the selection one layer up.",
    sendToBack: "Move the selection to the very back.",
    sendToFront: "Move the selection to the very front.",
  }), [])
  const aiTooltips = useMemo(() => ({
    summarize: "Write a concise summary of the selected content.",
    mapify: "Generate a mindmap of key ideas and relationships.",
    schemify: "Generate a structured schema of entities and links.",
    quizify: "Generate grouped MCQ exercises from the content.",
    drawify: "Draw a simple architecture/schema.",
    explain: "Explain the content in more detail, step by step.",
  }), [])

  const selectedNodes = useMemo(
    () => nodes.filter((node) => node.selected && (node.data as { kind?: string } | undefined)?.kind !== 'point'),
    [nodes],
  )

  const openMenu = useCallback((event: React.MouseEvent) => {
    event.preventDefault()
    setMenuPosition({ x: event.clientX, y: event.clientY })
  }, [])

  const handlePaneContextMenu = useCallback<NonNullable<ReactFlowProps<NoteNode, LinkEdge>['onPaneContextMenu']>>((event) => {
    if (!hasSelection) return
    openMenu(event as React.MouseEvent)
  }, [hasSelection, openMenu])

  const handleNodeContextMenu = useCallback<NonNullable<ReactFlowProps<NoteNode, LinkEdge>['onNodeContextMenu']>>((event, node) => {
    if (!node?.selected) return
    openMenu(event as React.MouseEvent)
  }, [openMenu])

  useEffect(() => {
    if (!menuPosition) return
    const close = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null
      if (target?.closest('[data-graph-context-menu="true"]')) return
      setMenuPosition(null)
      setTranslateOpen(false)
    }
    const listenerOptions: AddEventListenerOptions = { capture: true }
    window.addEventListener('mousedown', close, listenerOptions)
    return () => window.removeEventListener('mousedown', close, listenerOptions)
  }, [menuPosition])

  const applyToSelected = useCallback((updater: (z: number) => number) => {
    if (selectedSet.size === 0) return
    setNodesPersist(prev =>
      prev.map(node => {
        if (!selectedSet.has(node.id)) return node
        const kind = (node.data as { kind?: string } | undefined)?.kind
        const nodeType = (node.data as { style?: { type?: string } } | undefined)?.style?.type
        if (kind === 'point' || nodeType === 'slide') return node
        const currentZ = node.zIndex ?? 0
        return { ...node, zIndex: updater(currentZ) }
      }),
    )
    setMenuPosition(null)
  }, [selectedSet, setNodesPersist])

  const handleSendBackward = useCallback(() => {
    if (!canSendBackward) return
    applyToSelected(z => z - 1)
  }, [applyToSelected, canSendBackward])

  const handleSendForward = useCallback(() => {
    if (!canSendForward) return
    applyToSelected(z => z + 1)
  }, [applyToSelected, canSendForward])

  const handleSendToBack = useCallback(() => {
    if (selectedSet.size === 0) return
    const target = globalMin - 1
    applyToSelected(() => target)
  }, [applyToSelected, globalMin, selectedSet.size])

  const handleSendToFront = useCallback(() => {
    if (selectedSet.size === 0) return
    const target = globalMax + 1
    applyToSelected(() => target)
  }, [applyToSelected, globalMax, selectedSet.size])

  const handleAiAction = useCallback(async (actionKey: string) => {
    if (!boardId) {
      toast.error("Select a board first.")
      return
    }
    const contextText = buildContextTextFromNodes(selectedNodes)
    if (!contextText) {
      toast.error("Select at least one node with content.")
      return
    }
    setMenuPosition(null)
    await runAction({ boardId, contextText, actionKey })
  }, [boardId, runAction, selectedNodes])

  const commonLanguages = [
    'English',
    'French',
    'Spanish',
    'Chinese',
    'Japanese',
    'Korean',
    'German',
    'Portuguese',
  ]

  const handleTranslate = useCallback(async (language: string) => {
    if (!boardId) {
      toast.error("Select a board first.")
      return
    }
    const contextText = buildContextTextFromNodes(selectedNodes, { skipPrefix: true })
    if (!contextText) {
      toast.error("Select at least one node with content.")
      return
    }
    setMenuPosition(null)
    setTranslateOpen(false)
    await runAction({
      boardId,
      contextText,
      actionKey: 'translate',
      targetLanguage: language,
    })
  }, [boardId, runAction, selectedNodes])

  const aiActionIcons: Record<string, typeof ReduceParagraphIcon> = {
    summarize: ReduceParagraphIcon,
    mapify: GitForkIcon,
    schemify: Blockchain06Icon,
    quizify: ParagraphBulletsPoint01Icon,
    drawify: PaintBoardIcon,
    explain: Idea01Icon,
  }

  return (
    <>
      {children({
        onPaneContextMenu: handlePaneContextMenu,
        onNodeContextMenu: handleNodeContextMenu,
      })}

      {menuPosition && (
        <div
          className='fixed z-50 min-w-[180px] max-w-[320px] rounded-md border bg-popover text-popover-foreground shadow-lg p-1 text-sm'
          style={{ top: menuPosition.y, left: menuPosition.x }}
          onMouseDown={event => event.stopPropagation()}
          onContextMenu={event => event.preventDefault()}
          role='menu'
          data-graph-context-menu="true"
        >
          <div className='px-3 py-1 text-xs font-medium text-muted-foreground'>
            Position
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type='button'
                className='w-full px-3 py-2 text-left rounded hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2'
                onClick={handleSendBackward}
                disabled={!canSendBackward}
              >
                <HugeiconsIcon icon={LayerSendBackwardIcon} strokeWidth={2} className='size-4' />
                <span>Send backward</span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={8}>
              <div className="text-xs">{positionTooltips.sendBackward}</div>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type='button'
                className='w-full px-3 py-2 text-left rounded hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2'
                onClick={handleSendForward}
                disabled={!canSendForward}
              >
                <HugeiconsIcon icon={LayerBringForwardIcon} strokeWidth={2} className='size-4' />
                <span>Send forward</span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={8}>
              <div className="text-xs">{positionTooltips.sendForward}</div>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type='button'
                className='w-full px-3 py-2 text-left rounded hover:bg-muted flex items-center gap-2'
                onClick={handleSendToBack}
              >
                <HugeiconsIcon icon={LayerSendToBackIcon} strokeWidth={2} className='size-4' />
                <span>Send to back</span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={8}>
              <div className="text-xs">{positionTooltips.sendToBack}</div>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type='button'
                className='w-full px-3 py-2 text-left rounded hover:bg-muted flex items-center gap-2'
                onClick={handleSendToFront}
              >
                <HugeiconsIcon icon={LayerBringToFrontIcon} strokeWidth={2} className='size-4' />
                <span>Send to front</span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={8}>
              <div className="text-xs">{positionTooltips.sendToFront}</div>
            </TooltipContent>
          </Tooltip>

          {hasSelection && (
            <>
              <div className='my-1 h-px bg-border' />
              <div className='px-3 py-1 text-xs font-medium text-muted-foreground flex items-center gap-2'>
                <Sparkles className='size-3 text-secondary' />
                AI Spark
              </div>
              {aiMenuActions.map((action) => (
                <Tooltip key={action.key}>
                  <TooltipTrigger asChild>
                    <button
                      type='button'
                      className='w-full px-3 py-2 text-left rounded hover:bg-muted flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed'
                      onClick={() => handleAiAction(action.key)}
                      disabled={!!processingKey}
                    >
                      {aiActionIcons[action.key] ? (
                        <HugeiconsIcon icon={aiActionIcons[action.key]} strokeWidth={2} className='size-4 text-secondary' />
                      ) : null}
                      <span>{action.label}</span>
                      {action.key === 'drawify' && (
                        <span className='ml-auto text-[10px] uppercase tracking-wide text-muted-foreground border border-border rounded-full px-2 py-0.5'>
                          Beta
                        </span>
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right" sideOffset={8}>
                    <div className="text-xs">{aiTooltips[action.key as keyof typeof aiTooltips] || action.request}</div>
                  </TooltipContent>
                </Tooltip>
              ))}
              <div className='my-1 h-px bg-border' />
              <button
                type='button'
                className='w-full px-3 py-2 text-left rounded hover:bg-muted flex items-center gap-2'
                onClick={() => setTranslateOpen((open) => !open)}
              >
                <HugeiconsIcon icon={ChatTranslateIcon} strokeWidth={2} className='size-4 text-secondary' />
                <span>Translate</span>
                <span className='ml-auto text-xs text-muted-foreground'>
                  <HugeiconsIcon
                    icon={translateOpen ? ArrowDown01Icon : ArrowRight01Icon}
                    strokeWidth={2}
                    className='size-3'
                  />
                </span>
              </button>
              {translateOpen && (
                <div className='pl-3 pr-2 pb-2 pt-1 flex flex-col gap-2'>
                  <div className='flex items-center gap-2'>
                    <input
                      className='flex-1 h-7 rounded border border-input bg-background px-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/30'
                      placeholder='Custom language…'
                      value={customLanguage}
                      onChange={(event) => setCustomLanguage(event.target.value)}
                      onMouseDown={(event) => event.stopPropagation()}
                    />
                    <button
                      type='button'
                      className='h-7 px-2 rounded-sm bg-muted text-xs hover:text-secondary font-medium bg-muted/70 border border-border'
                      onClick={() => handleTranslate(customLanguage.trim() || 'English')}
                    >
                      Go
                    </button>
                  </div>
                  <div className='flex flex-wrap gap-2'>
                    {commonLanguages.map((language) => (
                      <button
                        key={language}
                        type='button'
                        className='px-2 py-1 rounded-full bg-muted text-xs font-medium hover:bg-muted/70'
                        onClick={() => handleTranslate(language)}
                      >
                        {language}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </>
  )
}
