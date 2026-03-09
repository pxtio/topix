import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { NoteNode } from "../../types/flow"
import { useGraphStore } from "../../store/graph-store"
import { useTheme } from "@/components/theme-provider"
import { darkModeDisplayHex, darkerDisplayHex, lighterDisplayHex } from "../../lib/colors/dark-variants"
import { isTransparent } from "../../lib/colors/tailwind"
import { fontFamilyToTwClass, fontSizeToTwClass, textStyleToTwClass } from "../../types/style"


type FolderNodeProps = {
  id: string
  data: NoteNode["data"]
}


type FolderIconProps = {
  backFill: string
  frontFill: string
  strokeColor: string
}


const FolderIcon = ({ backFill, frontFill, strokeColor }: FolderIconProps) => (
  <svg
    viewBox="0 0 176.34001148055313 139.78787752716778"
    className="w-full h-full"
    aria-hidden="true"
  >
    <rect x="0" y="0" width="176.34001148055313" height="139.78787752716778" fill="transparent" />
    <g strokeLinecap="round">
      <g transform="translate(10.909074119042202 10.141056228623995) rotate(0 77.26093162123442 59.75288253495998)" fillRule="evenodd">
        <path d="M-0.76 0.91 L60.29 -1.3 L85.75 21.46 L155.52 21.28 L152.85 119.91 L0.73 118.99 L-1.63 0.6" stroke="none" strokeWidth="0" fill={backFill} fillRule="evenodd" />
        <path d="M0 0 C17.53 -0.66, 33.72 1.27, 62.03 0 M0 0 C22.67 1.01, 44.88 1.39, 62.03 0 M62.03 0 C70 8.26, 78.24 17.45, 84.35 21.12 M62.03 0 C69.8 7.43, 76.96 14.93, 84.35 21.12 M84.35 21.12 C104.23 20.29, 123.92 20.16, 154.18 21.12 M84.35 21.12 C100.53 21.64, 115.05 21.4, 154.18 21.12 M154.18 21.12 C156.03 43.66, 155.66 66.44, 154.18 117.99 M154.18 21.12 C154.42 46.34, 153.85 70.99, 154.18 117.99 M154.18 117.99 C105.71 120.39, 57.4 120, 0 117.99 M154.18 117.99 C99.57 118.72, 44.44 118.88, 0 117.99 M0 117.99 C-2.07 73.13, 0.06 25.53, 0 0 M0 117.99 C-1.11 88.05, -0.32 58.66, 0 0 M0 0 C0 0, 0 0, 0 0 M0 0 C0 0, 0 0, 0 0" stroke={strokeColor} strokeWidth="4" fill="none" />
      </g>
    </g>
    <g strokeLinecap="round">
      <g transform="translate(165.44143002981946 31.259407577093214) rotate(0 -77.63307152033497 48.34282544496588)" fillRule="evenodd">
        <path d="M-1.76 -1.67 L-153.54 0.46 L-155.29 95.6 L-0.3 95.44 L-1.32 -0.23" stroke="none" strokeWidth="0" fill={frontFill} fillRule="evenodd" />
        <path d="M0 0 C-50.46 0.94, -96.36 -1.91, -154.53 0 M0 0 C-36.76 1.95, -72.04 1.43, -154.53 0 M-154.53 0 C-156.39 31.51, -154.07 60.1, -154.53 96.54 M-154.53 0 C-154.67 25.04, -154.45 50.2, -154.53 96.54 M-154.53 96.54 C-102.96 96.29, -51.57 98.51, -1.06 96.54 M-154.53 96.54 C-106.28 95.97, -58.46 96.49, -1.06 96.54 M-1.06 96.54 C-0.55 62.57, -1.68 27.93, 0 0 M-1.06 96.54 C-1.38 73.13, -0.02 48.15, 0 0 M0 0 C0 0, 0 0, 0 0 M0 0 C0 0, 0 0, 0 0" stroke={strokeColor} strokeWidth="4" fill="none" />
      </g>
    </g>
  </svg>
)


const normalizeLabel = (markdown?: string) => {
  const text = (markdown ?? "").replace(/\s+/g, " ").trim()
  return text || "Untitled folder"
}


export const FolderNode = memo(function FolderNode({ id, data }: FolderNodeProps) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'
  const updateNodeByIdPersist = useGraphStore(state => state.updateNodeByIdPersist)
  const [labelEditing, setLabelEditing] = useState(false)
  const [labelDraft, setLabelDraft] = useState(data.label?.markdown || "")
  const inputRef = useRef<HTMLInputElement | null>(null)
  const displayLabel = normalizeLabel(data.label?.markdown)
  const textAlignClass = data.style.textAlign === 'left' ? 'text-left' : data.style.textAlign === 'right' ? 'text-right' : 'text-center'
  const fontClass = fontFamilyToTwClass(data.style.fontFamily)
  const sizeClass = fontSizeToTwClass(data.style.fontSize)
  const textStyleClass = textStyleToTwClass(data.style.textStyle)

  const displayBackground = useMemo(() => (
    isDark ? darkModeDisplayHex(data.style.backgroundColor) ?? '#dbeafe' : data.style.backgroundColor
  ), [data.style.backgroundColor, isDark])

  const iconBackFill = useMemo(() => (
    isDark
      ? lighterDisplayHex(displayBackground) ?? displayBackground
      : darkerDisplayHex(displayBackground) ?? displayBackground
  ), [displayBackground, isDark])

  const iconFrontFill = displayBackground

  const displayTextColor = useMemo(() => (
    isDark ? darkModeDisplayHex(data.style.textColor) ?? '#e4e4e7' : data.style.textColor
  ), [data.style.textColor, isDark])

  const displayStrokeColor = useMemo(() => {
    if (!isTransparent(data.style.strokeColor)) {
      return isDark ? darkModeDisplayHex(data.style.strokeColor) ?? '#1e1e1e' : data.style.strokeColor
    }

    return displayTextColor
  }, [data.style.strokeColor, displayTextColor, isDark])

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
        <FolderIcon
          backFill={iconBackFill}
          frontFill={iconFrontFill}
          strokeColor={displayStrokeColor}
        />
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
            className={`w-full bg-transparent border-0 border-b border-foreground/30 focus:border-secondary focus:outline-none px-0 py-0.5 ${textAlignClass} ${fontClass} ${sizeClass} ${textStyleClass}`}
            style={{ color: displayTextColor }}
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
            className={`block w-full truncate hover:underline ${textAlignClass} ${fontClass} ${sizeClass} ${textStyleClass}`}
            style={{ color: displayTextColor }}
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
