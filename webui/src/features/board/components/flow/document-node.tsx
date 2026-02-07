import { memo } from "react"
import type { NodeProps } from "@xyflow/react"
import type { NoteNode } from "../../types/flow"
import type { DocumentProperties } from "../../types/document"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import type { Style } from "../../types/style"
import { cn } from "@/lib/utils"
import { useTheme } from "@/components/theme-provider"
import { darkModeDisplayHex } from "../../lib/colors/dark-variants"


/**
 * A node component for displaying document nodes in the flow board.
 */
type PdfIconProps = {
  pageFill: string
  panelFill: string
  outline: string
  textFill: string
  scribble: string
}

const PdfIcon = ({ pageFill, panelFill, outline, textFill, scribble }: PdfIconProps) => (
  <svg
    viewBox="0 0 117.67525151090831 139.73315199366107"
    className="w-full h-full"
    aria-hidden="true"
  >
    <rect x="0" y="0" width="117.67525151090831" height="139.73315199366107" fill="transparent" />
    <g strokeLinecap="round" transform="translate(10 10) rotate(0 43.92912551591962 59.866575996830534)">
      <path d="M0.54 -1.78 L86.22 0.99 L86.6 119.57 L0.87 120.15" stroke="none" strokeWidth="0" fill={pageFill} />
      <path d="M0 0 C21.44 1.96, 41.81 -1.09, 87.86 0 M0 0 C18.48 -0.07, 38.75 0.23, 87.86 0 M87.86 0 C89.68 42.54, 87.63 83.03, 87.86 119.73 M87.86 0 C85.87 27.27, 87.11 54.65, 87.86 119.73 M87.86 119.73 C53.64 120.77, 21.81 121.28, 0 119.73 M87.86 119.73 C66.32 120, 46.93 119.62, 0 119.73 M0 119.73 C0.97 89.37, 1.54 60.61, 0 0 M0 119.73 C0.06 79.48, 1.44 38.03, 0 0" stroke={outline} strokeWidth="4" fill="none" />
    </g>
    <g strokeLinecap="round" transform="translate(49.33931401090831 24.4825232163912) rotate(0 29.16796875 15.000000000000227)">
      <path d="M-1.63 0.99 L57.08 -0.17 L59.21 30.41 L1.57 30.28" stroke="none" strokeWidth="0" fill={panelFill} />
      <path d="M0 0 C10.9 -2.17, 23.84 1.28, 58.34 0 M0 0 C14.94 0.1, 29.96 0.85, 58.34 0 M58.34 0 C57.61 10.52, 57.15 21.32, 58.34 30 M58.34 0 C58.28 8.21, 58.91 17.61, 58.34 30 M58.34 30 C43.52 31.98, 23.45 31.13, 0 30 M58.34 30 C43.44 30.54, 26.94 30.43, 0 30 M0 30 C1.49 20.31, 0.63 10.74, 0 0 M0 30 C0.79 23.32, 0.52 16.5, 0 0" stroke={outline} strokeWidth="4" fill="none" />
    </g>
    <g transform="translate(58.629823331121315 28.904475129760613) rotate(0 21.389984130859375 12.5)">
      <text
        x="0"
        y="17.62"
        fontFamily="var(--font-handwriting)"
        fontSize="20px"
        fill={textFill}
        textAnchor="start"
        style={{ whiteSpace: "pre" }}
        direction="ltr"
        dominantBaseline="alphabetic"
      >
        PDF
      </text>
    </g>
    <g strokeLinecap="round">
      <g transform="translate(54.5149032563254 81.57018826929334) rotate(351.57439371648013 -0.5603504143064129 13.724938776018462)">
        <path d="M0 0 C-1.93 5.22, -7.64 26.96, -11.57 31.32 C-15.51 35.69, -29.2 27.93, -23.61 26.2 C-18.03 24.46, 15.99 20.49, 21.93 20.9 C27.88 21.31, 18.39 32.73, 12.04 28.63 C5.69 24.54, -14.18 1.12, -16.19 -3.65 C-18.2 -8.42, -2.7 -0.61, 0 0 M0 0 C-1.93 5.22, -7.64 26.96, -11.57 31.32 C-15.51 35.69, -29.2 27.93, -23.61 26.2 C-18.03 24.46, 15.99 20.49, 21.93 20.9 C27.88 21.31, 18.39 32.73, 12.04 28.63 C5.69 24.54, -14.18 1.12, -16.19 -3.65 C-18.2 -8.42, -2.7 -0.61, 0 0" stroke={scribble} strokeWidth="4" fill="none" />
      </g>
    </g>
  </svg>
)


/**
 * A React component that renders a document node within a flow board.
 */
export const DocumentNode = memo(function DocumentNode({ data, selected }: NodeProps<NoteNode>) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === "dark"
  const label = data.label?.markdown?.trim()
  const summary = (data.properties as DocumentProperties)?.summary?.text?.trim()
  const displayLabel = label || "Untitled document"
  const style = data.style as Style | undefined
  const rounded = (style?.roundness ?? 1) > 0 ? "rounded-xl" : "rounded-none"

  const pageFill = isDark ? darkModeDisplayHex("#f48284") || "#f48284" : "#f48284"
  const panelFill = isDark ? darkModeDisplayHex("#ffffff") || "#ffffff" : "#ffffff"
  const outline = isDark ? darkModeDisplayHex("#000000") || "#000000" : "#000000"
  const textFill = outline
  const scribble = outline

  const className = cn(
    "w-full h-full p-3 text-card-foreground border-2 border-dashed flex flex-col items-center text-center",
    rounded,
    selected ? "border-secondary" : "border-transparent",
  )

  const content = (
    <div className="relative w-full h-full">
      <div className={className}>
      <div className="w-full max-w-[110px] aspect-square">
        <PdfIcon pageFill={pageFill} panelFill={panelFill} outline={outline} textFill={textFill} scribble={scribble} />
      </div>
      </div>
      <div className="absolute left-1/2 top-full mt-2 w-full -translate-x-1/2 text-sm font-medium line-clamp-2 break-words max-w-[220px] overflow-ellipsis text-center text-card-foreground">
        <span className="block" title={displayLabel} aria-label={displayLabel}>
          {displayLabel}
        </span>
      </div>
    </div>
  )

  if (!summary) {
    return content
  }

  return (
    <Tooltip delayDuration={300}>
      <TooltipTrigger asChild>
        {content}
      </TooltipTrigger>
      <TooltipContent side="top" align="center" className="max-w-72">
        <p className="text-xs leading-relaxed">{summary}</p>
      </TooltipContent>
    </Tooltip>
  )
})
