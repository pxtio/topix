import { memo, useCallback, useEffect, useRef, useState } from "react"
import type { NoteNode } from "../../types/flow"
import { useGraphStore } from "../../store/graph-store"


type FolderNodeProps = {
  id: string
  data: NoteNode["data"]
}


const FolderIcon = () => (
  <svg
    viewBox="0 0 239.61675180640952 196.9211981510229"
    className="w-full h-full"
    aria-hidden="true"
  >
    <rect x="0" y="0" width="239.61675180640952" height="196.9211981510229" fill="transparent" />
    <g strokeLinecap="round">
      <g transform="translate(11.527037480708259 10.079258316532616) rotate(0 108.28133842249648 88.38134075897881)" fillRule="evenodd">
        <path d="M0.55 0 L88.49 1.43 L117.89 30.93 L218.16 29.53 L219.47 175.97 L-0.69 176.11 L-0.41 0.92" stroke="none" strokeWidth="0" fill="#e9ecef" fillRule="evenodd" />
        <path d="M0 0 C19.64 0.71, 39.04 0.69, 87.5 0 M0 0 C28.25 -0.31, 56.76 0.41, 87.5 0 M87.5 0 C97.47 8.86, 105.42 16.59, 119 31.5 M87.5 0 C94.47 6.84, 102.49 14.49, 119 31.5 M119 31.5 C143.71 30.93, 170.71 31.47, 217.5 31.5 M119 31.5 C142.54 29.82, 165.91 31.33, 217.5 31.5 M217.5 31.5 C218.59 74.15, 215.83 118.08, 217.5 176 M217.5 31.5 C218.89 71.6, 217.36 109.44, 217.5 176 M217.5 176 C147.6 177.29, 76.5 176.94, 0 176 M217.5 176 C155.51 175.84, 95.08 176.11, 0 176 M0 176 C-0.97 105.34, -2.89 36.72, 0 0 M0 176 C-0.04 117.48, 0.31 59.89, 0 0 M0 0 C0 0, 0 0, 0 0 M0 0 C0 0, 0 0, 0 0" stroke="#1e1e1e" strokeWidth="2" fill="none" />
      </g>
    </g>
    <g strokeLinecap="round">
      <g transform="translate(228.52703748070826 41.579258316532616) rotate(0 -109.14308751488099 71.71380597043736)" fillRule="evenodd">
        <path d="M0.43 1.38 L-217.1 1.54 L-218.24 143.53 L-0.39 143.92 L1.34 -0.47" stroke="none" strokeWidth="0" fill="#f8f9fa" fillRule="evenodd" />
        <path d="M0 0 C-47.07 -1.15, -91.14 -0.25, -218 0 M0 0 C-46.6 2.02, -92.15 1.23, -218 0 M-218 0 C-216.69 56.45, -219.07 110.59, -218 144 M-218 0 C-218.02 42.57, -217.21 83.99, -218 144 M-218 144 C-172.21 141.84, -128.41 143.93, -1.5 144 M-218 144 C-164.82 143.35, -110.26 143.78, -1.5 144 M-1.5 144 C-0.59 112.38, -0.56 78.07, 0 0 M-1.5 144 C-0.33 100.32, -0.34 56, 0 0 M0 0 C0 0, 0 0, 0 0 M0 0 C0 0, 0 0, 0 0" stroke="#1e1e1e" strokeWidth="2" fill="none" />
      </g>
    </g>
  </svg>
)


const normalizeLabel = (markdown?: string) => {
  const text = (markdown ?? "").replace(/\s+/g, " ").trim()
  return text || "Untitled folder"
}


export const FolderNode = memo(function FolderNode({ id, data }: FolderNodeProps) {
  const updateNodeByIdPersist = useGraphStore(state => state.updateNodeByIdPersist)
  const [labelEditing, setLabelEditing] = useState(false)
  const [labelDraft, setLabelDraft] = useState(data.label?.markdown || "")
  const inputRef = useRef<HTMLInputElement | null>(null)
  const displayLabel = normalizeLabel(data.label?.markdown)

  useEffect(() => {
    if (labelEditing) return
    setLabelDraft(data.label?.markdown || "")
  }, [data.label?.markdown, labelEditing])

  useEffect(() => {
    if (!labelEditing) return
    const frame = requestAnimationFrame(() => {
      inputRef.current?.focus()
      inputRef.current?.select()
    })
    return () => cancelAnimationFrame(frame)
  }, [labelEditing])

  const commitLabel = useCallback((nextRaw: string) => {
    const next = nextRaw.trim()
    const prev = data.label?.markdown?.trim() || ""
    if (next === prev) return
    updateNodeByIdPersist(id, prevNode => ({
      ...prevNode,
      data: {
        ...prevNode.data,
        label: next ? { markdown: next } : undefined,
      },
    }))
  }, [data.label?.markdown, id, updateNodeByIdPersist])

  const stopLabelEdit = useCallback((save: boolean) => {
    if (save) commitLabel(labelDraft)
    else setLabelDraft(data.label?.markdown || "")
    setLabelEditing(false)
  }, [commitLabel, data.label?.markdown, labelDraft])

  return (
    <div className="relative w-full h-full">
      <div className="w-full h-full">
        <FolderIcon />
      </div>

      <div className="absolute left-1/2 top-full mt-2 w-full -translate-x-1/2 max-w-[220px]">
        {labelEditing ? (
          <input
            data-folder-label-edit="true"
            ref={inputRef}
            value={labelDraft}
            onChange={event => setLabelDraft(event.target.value)}
            onBlur={() => stopLabelEdit(true)}
            onKeyDown={event => {
              if (event.key === "Enter") {
                event.preventDefault()
                stopLabelEdit(true)
              }
              if (event.key === "Escape") {
                event.preventDefault()
                stopLabelEdit(false)
              }
            }}
            onMouseDown={event => event.stopPropagation()}
            onDoubleClick={event => event.stopPropagation()}
            onClick={event => event.stopPropagation()}
            className="w-full bg-transparent text-center text-sm font-handwriting text-card-foreground border-0 border-b border-foreground/30 focus:border-secondary focus:outline-none px-0 py-0.5"
            placeholder="Untitled folder"
          />
        ) : (
          <button
            type="button"
            data-folder-label-edit="true"
            onClick={event => {
              event.stopPropagation()
              setLabelEditing(true)
            }}
            onDoubleClick={event => event.stopPropagation()}
            className="block w-full truncate text-center text-sm font-handwriting text-card-foreground hover:underline"
            title={displayLabel}
            aria-label={displayLabel}
          >
            {displayLabel}
          </button>
        )}
      </div>
    </div>
  )
})

