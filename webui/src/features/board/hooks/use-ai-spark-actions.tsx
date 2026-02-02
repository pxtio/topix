import { useMemo, useState } from "react"
import { toast } from "sonner"
import { CancelIcon, CheckmarkCircle03Icon, ReloadIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { useConvertToMindMap } from "@/features/board/api/convert-to-mindmap"

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
}

const defaultActions: AiSparkAction[] = [
  { key: "summarize", label: "Summarize (quick overview)", request: "Summarize the key points and structure concisely." },
  { key: "mapify", label: "Mapify (generate mindmap)", request: "Generate a mindmap capturing the main ideas and relationships." },
  { key: "schemify", label: "Schemify (generate schema)", request: "Generate a structured schema of entities and relationships." },
  { key: "explain", label: "Explain (more detail)", request: "Explain the content in more detail with clear, step-by-step reasoning." },
]

export const useAiSparkActions = () => {
  const { convertToMindMapAsync } = useConvertToMindMap()
  const [processingKey, setProcessingKey] = useState<string | null>(null)

  const actions = useMemo(() => defaultActions, [])

  const runAction = async ({
    boardId,
    contextText,
    actionKey,
    customRequest,
    useAnchors = true,
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
    if (!request) {
      toast.error("Add a request first.")
      return false
    }

    setProcessingKey(actionKey ?? "custom")
    const toastId = toast("Working on it…", {
      duration: Infinity,
      icon: <HugeiconsIcon icon={ReloadIcon} className="size-4 animate-spin [animation-duration:750ms]" strokeWidth={2} />,
    })
    try {
      const answer = `Request: ${request}\n---\nInput Text:\n${contextText.trim()}`
      await convertToMindMapAsync({ boardId, answer, toolType: "summify", useAnchors })
      toast.success("Added to board.", {
        id: toastId,
        icon: <HugeiconsIcon icon={CheckmarkCircle03Icon} className="size-4" strokeWidth={2} />,
      })
      return true
    } catch (error) {
      console.error("AI action failed:", error)
      toast.error("Could not complete the action.", {
        id: toastId,
        icon: <HugeiconsIcon icon={CancelIcon} className="size-4" strokeWidth={2} />,
      })
      return false
    } finally {
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
