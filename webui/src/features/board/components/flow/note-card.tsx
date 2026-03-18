import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { clsx } from "clsx"

import { Shape } from "../notes/shape"
import { SheetNodeView } from "./sheet-node-view"
import { CodeSandboxNode } from "./code-sandbox-node"
import { WidgetNode } from "./widget-node"
import { useGraphStore } from "../../store/graph-store"
import { darkModeDisplayHex } from "../../lib/colors/dark-variants"
import { fontFamilyToTwClass, fontSizeToTwClass, textStyleToTwClass } from "../../types/style"
import type { NoteNode } from "../../types/flow"
import type { Note, NoteProperties } from "../../types/note"


export type NoteWithPin = Note & { pinned?: boolean; autoEdit?: boolean }


type NodeCardProps = {
  note: NoteWithPin
  selected: boolean
  dragging?: boolean
  onLabelEditingChange?: (editing: boolean) => void
  isDark: boolean
  contentRef: React.RefObject<HTMLDivElement | null>
  nodeWidth?: number
  nodeHeight?: number
  onCanvasRenderReadyChange?: (ready: boolean) => void
}

type LabelContainerProps = {
  className: string
  textColor?: string
  onDoubleClick: () => void
  onPointerDown: (event: React.PointerEvent) => void
  children: React.ReactNode
}

type NoteDisplayContentProps = {
  note: NoteWithPin
  labelEditing: boolean
  labelDraft: string
  textareaRef: React.RefObject<HTMLTextAreaElement | null>
  onLabelChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void
  contentRef: React.RefObject<HTMLDivElement | null>
  textColor?: string
  nodeWidth?: number
  nodeHeight?: number
  onCanvasRenderReadyChange?: (ready: boolean) => void
}


/**
 * Shared wrapper for interactive node content.
 */
const LabelContainer = memo(function LabelContainer({
  className,
  textColor,
  onDoubleClick,
  onPointerDown,
  children,
}: LabelContainerProps) {
  return (
    <div
      className={className}
      onDoubleClick={onDoubleClick}
      onPointerDown={onPointerDown}
      style={{ color: textColor || "inherit" }}
    >
      {children}
    </div>
  )
})


/**
 * Display renderer for standard note content and inline editing.
 */
const NoteDisplayContent = memo(function NoteDisplayContent({
  note,
  labelEditing,
  labelDraft,
  textareaRef,
  onLabelChange,
  contentRef,
  textColor,
  nodeWidth,
  nodeHeight,
  onCanvasRenderReadyChange,
}: NoteDisplayContentProps) {
  const fontFamily = note.style.type === "sheet" ? "sans-serif" : note.style.fontFamily
  const icon =
    note.properties.iconData?.type === "icon" && note.properties.iconData.icon?.type === "icon"
      ? note.properties.iconData.icon.icon
      : undefined
  const imageUrl = note.properties.imageUrl?.image?.url
  const renderWidth = nodeWidth ?? note.properties.nodeSize?.size?.width
  const renderHeight = nodeHeight ?? note.properties.nodeSize?.size?.height

  return (
    <Shape
      nodeType={note.style.type}
      value={labelEditing ? labelDraft : note.content?.markdown || note.label?.markdown || ""}
      labelEditing={labelEditing}
      onChange={onLabelChange}
      textareaRef={textareaRef}
      textAlign={note.style.textAlign}
      styleHelpers={{
        text: textStyleToTwClass(note.style.textStyle),
        font: fontFamilyToTwClass(fontFamily),
        size: fontSizeToTwClass(note.style.fontSize),
      }}
      contentRef={contentRef}
      icon={icon}
      imageUrl={imageUrl}
      renderWidth={renderWidth}
      renderHeight={renderHeight}
      renderTextColor={textColor}
      renderFontFamily={note.style.fontFamily}
      renderFontSize={note.style.fontSize}
      renderTextStyle={note.style.textStyle}
      onCanvasRenderReadyChange={onCanvasRenderReadyChange}
    />
  )
})


/**
 * Root node card renderer used inside flow nodes.
 */
export const NodeCard = memo(function NodeCard({
  note,
  selected,
  dragging,
  onLabelEditingChange,
  isDark,
  contentRef,
  nodeWidth,
  nodeHeight,
  onCanvasRenderReadyChange,
}: NodeCardProps) {
  const isSheet = note.style.type === "sheet"
  const isCodeSandbox = note.style.type === "code-sandbox"
  const isWidget = note.style.type === "widget"
  const isText = note.style.type === "text"
  const nonSheetDisplayValue = note.content?.markdown || note.label?.markdown || ""

  const setNodesPersist = useGraphStore((state) => state.setNodesPersist)
  const updateNodeByIdPersist = useGraphStore((state) => state.updateNodeByIdPersist)
  const setEdgesPersist = useGraphStore((state) => state.setEdgesPersist)
  const boardCanEdit = useGraphStore((state) => state.boardCanEdit)
  const openNodeSurface = useGraphStore((state) => state.openNodeSurface)

  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const [labelEditing, setLabelEditing] = useState(false)
  const [labelDraft, setLabelDraft] = useState<string>(nonSheetDisplayValue)
  const [debouncedLabelDraft, setDebouncedLabelDraft] = useState<string>(nonSheetDisplayValue)
  const selRef = useRef<{ start: number; end: number } | null>(null)

  const textColor = isDark ? darkModeDisplayHex(note.style.textColor) || undefined : note.style.textColor
  const sheetBackgroundColor = isDark
    ? darkModeDisplayHex(note.style.backgroundColor) || note.style.backgroundColor
    : note.style.backgroundColor
  const isPinned = note.properties.pinned.boolean === true
  const fontFamily = note.style.type === "sheet" ? "sans-serif" : note.style.fontFamily
  const displayTitle = note.label?.markdown?.trim() || "Untitled note"

  const labelClass = useMemo(
    () =>
      clsx(
        "relative bg-transparent overflow-visible flex items-center justify-center",
        isSheet
          ? `w-[360px] ${fontFamilyToTwClass(fontFamily)}`
          : isText
            ? "w-full h-full p-0"
            : "w-full h-full p-1",
      ),
    [fontFamily, isSheet, isText],
  )

  useEffect(() => {
    if (!labelEditing) {
      setLabelDraft(nonSheetDisplayValue)
      setDebouncedLabelDraft(nonSheetDisplayValue)
    }
  }, [labelEditing, nonSheetDisplayValue])

  useEffect(() => {
    if (!labelEditing) return

    const timer = window.setTimeout(() => {
      setDebouncedLabelDraft(labelDraft)
    }, 300)

    return () => window.clearTimeout(timer)
  }, [labelDraft, labelEditing])

  useEffect(() => {
    onLabelEditingChange?.(labelEditing)
  }, [labelEditing, onLabelEditingChange])

  useEffect(() => {
    if (!selected) {
      setLabelEditing(false)
    }
  }, [selected])

  useEffect(() => {
    if (!isText || !note.autoEdit) return

    setLabelEditing(true)
    updateNodeByIdPersist(note.id, (node) => ({
      ...node,
      data: {
        ...node.data,
        autoEdit: false,
      },
    }))
  }, [isText, note.autoEdit, note.id, updateNodeByIdPersist])

  useEffect(() => {
    if (!labelEditing) return
    const element = textareaRef.current
    if (!element) return

    element.focus()
    const length = element.value.length
    try {
      element.setSelectionRange(length, length)
    } catch {
      console.warn("Failed to set selection range")
    }
  }, [labelEditing])

  useLayoutEffect(() => {
    if (!labelEditing) return
    const element = textareaRef.current
    const selection = selRef.current
    if (!element || !selection) return

    const restore = () => {
      try {
        element.setSelectionRange(selection.start, selection.end)
      } catch {
        console.warn("Failed to restore selection range")
      }
    }

    restore()
    const frameId = requestAnimationFrame(restore)
    return () => cancelAnimationFrame(frameId)
  }, [labelDraft, labelEditing])

  useEffect(() => {
    if (!labelEditing || debouncedLabelDraft === nonSheetDisplayValue) return

    updateNodeByIdPersist(note.id, (node) => ({
      ...node,
      data: {
        ...node.data,
        content: { markdown: debouncedLabelDraft },
      },
    }))
  }, [debouncedLabelDraft, labelEditing, nonSheetDisplayValue, note.id, updateNodeByIdPersist])

  const handleLabelChange = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const next = event.target.value
    selRef.current = {
      start: event.target.selectionStart ?? next.length,
      end: event.target.selectionEnd ?? next.length,
    }
    setLabelDraft(next)
  }, [])

  const updateStyle = useCallback((next: Partial<Note["style"]>) => {
    updateNodeByIdPersist(note.id, (node) => {
      const data = node.data as NoteNode["data"]
      return {
        ...node,
        data: {
          ...data,
          style: {
            ...data.style,
            ...next,
          },
        },
      }
    })
  }, [note.id, updateNodeByIdPersist])

  const stopDragging = useCallback((event: React.PointerEvent) => {
    if (labelEditing) {
      event.stopPropagation()
    }
  }, [labelEditing])

  const handleLabelDoubleClick = useCallback(() => {
    if (!isSheet) {
      setLabelEditing(true)
    }
  }, [isSheet])

  const handleTogglePin = useCallback((event: React.MouseEvent) => {
    event.stopPropagation()
    updateNodeByIdPersist(note.id, (node) => {
      const props = node.data.properties as NoteProperties
      return {
        ...node,
        data: {
          ...node.data,
          properties: {
            ...props,
            pinned: { type: "boolean", boolean: !isPinned },
          },
        },
      }
    })
  }, [isPinned, note.id, updateNodeByIdPersist])

  const handleDelete = useCallback((event: React.MouseEvent) => {
    event.stopPropagation()
    setNodesPersist((nodes) => nodes.filter((node) => node.id !== note.id))
    setEdgesPersist((edges) => edges.filter((edge) => edge.source !== note.id && edge.target !== note.id))
  }, [note.id, setEdgesPersist, setNodesPersist])

  const handlePickPalette = useCallback((hex: string) => {
    updateStyle({ backgroundColor: hex })
  }, [updateStyle])

  const handleOpenSheet = useCallback(() => {
    if (!boardCanEdit) return
    openNodeSurface(note.id, "sheet")
  }, [boardCanEdit, note.id, openNodeSurface])

  if (!isSheet) {
    if (isCodeSandbox) {
      return (
        <LabelContainer
          className={labelClass}
          textColor={textColor}
          onDoubleClick={handleLabelDoubleClick}
          onPointerDown={stopDragging}
        >
          <CodeSandboxNode note={note} dragging={dragging} />
        </LabelContainer>
      )
    }

    if (isWidget) {
      return (
        <LabelContainer
          className={labelClass}
          textColor={textColor}
          onDoubleClick={handleLabelDoubleClick}
          onPointerDown={stopDragging}
        >
          <WidgetNode note={note} dragging={dragging} />
        </LabelContainer>
      )
    }

    return (
      <LabelContainer
        className={labelClass}
        textColor={textColor}
        onDoubleClick={handleLabelDoubleClick}
        onPointerDown={stopDragging}
      >
        <NoteDisplayContent
          note={note}
          labelEditing={labelEditing}
          labelDraft={labelDraft}
          textareaRef={textareaRef}
          onLabelChange={handleLabelChange}
          contentRef={contentRef}
          textColor={textColor}
          nodeWidth={nodeWidth}
          nodeHeight={nodeHeight}
          onCanvasRenderReadyChange={onCanvasRenderReadyChange}
        />
      </LabelContainer>
    )
  }

  return (
    <LabelContainer
      className={labelClass}
      textColor={textColor}
      onDoubleClick={handleLabelDoubleClick}
      onPointerDown={stopDragging}
    >
      <div className="relative w-full h-full">
        <SheetNodeView
          note={note}
          selected={selected}
          dragging={dragging}
          isDark={isDark}
          isPinned={isPinned}
          backgroundColor={sheetBackgroundColor}
          onPickPalette={handlePickPalette}
          onTogglePin={handleTogglePin}
          onDelete={handleDelete}
          onOpenSticky={handleOpenSheet}
        />
        <div className="absolute left-1/2 top-full mt-4 w-full -translate-x-1/2 px-2">
          <button
            type="button"
            onMouseDown={(event) => event.stopPropagation()}
            onClick={handleOpenSheet}
            className="block w-full truncate text-center text-sm font-semibold text-card-foreground hover:underline"
            title={displayTitle}
          >
            {displayTitle}
          </button>
        </div>
      </div>
    </LabelContainer>
  )
})
