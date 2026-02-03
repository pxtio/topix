import { useMemo, useState } from "react"
import { toast } from "sonner"
import { CancelIcon, CheckmarkCircle03Icon, ReloadIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { useConvertToMindMap } from "@/features/board/api/convert-to-mindmap"
import { useTranslateText } from "@/features/board/api/translate-text"
import { useMindMapStore } from "@/features/agent/store/mindmap-store"
import { createDefaultLinkStyle, createDefaultStyle } from "@/features/board/types/style"
import { convertLinkToEdge, convertNoteToNode } from "@/features/board/utils/graph"
import { autoLayout } from "@/features/board/lib/graph/auto-layout"
import { defaultLayoutOptions } from "@/features/board/lib/graph/settings"
import { pickRandomColorOfShade } from "@/features/board/lib/colors/tailwind"
import type { LinkEdge, NoteNode } from "@/features/board/types/flow"
import type { Note } from "@/features/board/types/note"
import type { Link } from "@/features/board/types/link"

export type AiSparkAction = {
  key: string
  label: string
  request: string
}

export type AiSparkRunParams = {
  boardId?: string
  contextText: string
  actionKey?: string
  customRequest?: string
  useAnchors?: boolean
  targetLanguage?: string
}

const defaultActions: AiSparkAction[] = [
  { key: "summarize", label: "Write a summary", request: "Write a concise summary." },
  { key: "mapify", label: "Mapify (generate mindmap)", request: "Generate a mindmap capturing the main ideas and relationships." },
  { key: "schemify", label: "Schemify (generate schema)", request: "Generate a structured schema of entities and relationships." },
  { key: "quizify", label: "Quizify (MCQ exercises)", request: "Generate multiple-choice exercises grouped by theme." },
  { key: "translate", label: "Translate", request: "Translate the input to the target language." },
  { key: "explain", label: "Explain (more detail)", request: "Explain the content in more detail with clear, step-by-step reasoning." },
]

export const useAiSparkActions = () => {
  const { convertToMindMapAsync } = useConvertToMindMap()
  const { translateTextAsync } = useTranslateText()
  const setMindMap = useMindMapStore(state => state.setMindMap)
  const [processingKey, setProcessingKey] = useState<string | null>(null)

  const actions = useMemo(() => defaultActions, [])

  const storeMindMap = async ({
    boardId,
    notes,
    links,
    useAnchors,
  }: {
    boardId: string
    notes: Note[]
    links: Link[]
    useAnchors?: boolean
  }) => {
    notes.forEach(note => {
      note.graphUid = boardId
      note.style = createDefaultStyle({ type: note.style.type })
    })
    links.forEach(link => {
      link.graphUid = boardId
      link.style = createDefaultLinkStyle()
    })
    if (notes.length > 0) {
      notes.forEach((note) => {
        note.style.backgroundColor = pickRandomColorOfShade(200, undefined)?.hex || note.style.backgroundColor
      })
    }

    const rawNodes = notes.map(convertNoteToNode)
    const rawEdges = links.map(convertLinkToEdge)

    const ns: NoteNode[] = []
    const es: LinkEdge[] = []

    const { nodes, edges } = await autoLayout(rawNodes, rawEdges, defaultLayoutOptions)
    ns.push(...nodes)
    es.push(...edges)

    setMindMap(boardId, ns, es, useAnchors)
  }

  const runAction = async ({
    boardId,
    contextText,
    actionKey,
    customRequest,
    useAnchors = true,
    targetLanguage = "English",
  }: AiSparkRunParams) => {
    if (!boardId) {
      toast.error("Select a board first.")
      return false
    }
    if (!contextText.trim()) {
      toast.error("Add some context text first.")
      return false
    }
    if (processingKey) return false

    const action = actionKey ? actions.find((item) => item.key === actionKey) : undefined
    const request = (customRequest ?? action?.request ?? "").trim()

    if (!request && actionKey !== "translate") {
      toast.error("Add a request first.")
      return false
    }

    setProcessingKey(actionKey ?? "custom")
    const startedAt = Date.now()
    const formatElapsed = () => `${Math.max(0, Math.floor((Date.now() - startedAt) / 1000))}s`
    const toastId = toast(`Working on it… ${formatElapsed()}`, {
      duration: Infinity,
      icon: <HugeiconsIcon icon={ReloadIcon} className="size-4 animate-spin [animation-duration:750ms]" strokeWidth={2} />,
    })
    const timer = window.setInterval(() => {
      toast(`Working on it… ${formatElapsed()}`, {
        id: toastId,
        icon: <HugeiconsIcon icon={ReloadIcon} className="size-4 animate-spin [animation-duration:750ms]" strokeWidth={2} />,
      })
    }, 1000)
    try {
      if (actionKey === "translate") {
        const { notes, links } = await translateTextAsync({
          text: contextText.trim(),
          targetLanguage
        })
        await storeMindMap({ boardId, notes, links, useAnchors })
      } else {
        const answer = `Request: ${request}\n---\nInput Text:\n${contextText.trim()}`
        const toolType = actionKey === "quizify" ? "quizify" : "summify"
        await convertToMindMapAsync({ boardId, answer, toolType, useAnchors })
      }
      window.clearInterval(timer)
      const finalElapsed = formatElapsed()
      toast.success(`Added to board. (${finalElapsed})`, {
        id: toastId,
        icon: <HugeiconsIcon icon={CheckmarkCircle03Icon} className="size-4" strokeWidth={2} />,
      })
      return true
    } catch (error) {
      console.error("AI action failed:", error)
      window.clearInterval(timer)
      const finalElapsed = formatElapsed()
      toast.error(`Could not complete the action. (${finalElapsed})`, {
        id: toastId,
        icon: <HugeiconsIcon icon={CancelIcon} className="size-4" strokeWidth={2} />,
      })
      return false
    } finally {
      window.clearInterval(timer)
      setProcessingKey(null)
      toast.dismiss(toastId)
    }
  }

  return {
    actions,
    processingKey,
    runAction,
  }
}
