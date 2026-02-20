import { memo } from 'react'
import clsx from 'clsx'

import type { NoteNode } from '../../types/flow'
import type { DocumentProperties } from '../../types/document'
import { useTheme } from '@/components/theme-provider'
import { darkModeDisplayHex } from '../../lib/colors/dark-variants'
import { formatDistanceToNow } from '../../utils/date'


type Props = {
  node: NoteNode
}


export const LinearDocumentCard = memo(function LinearDocumentCard({ node }: Props) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  const label = node.data.label?.markdown?.trim()
  const displayLabel = label || 'Untitled document'
  const docProps = node.data.properties as DocumentProperties
  const summary = docProps.summary?.text?.trim()
  const status = docProps.status?.value
  const mimeType = docProps.mimeType?.text
  const color = isDark
    ? darkModeDisplayHex(node.data.style.backgroundColor) ?? '#a5c9ff'
    : node.data.style.backgroundColor
  const { text: timeAgo, tooltip: fullDate } = formatDistanceToNow(node.data.updatedAt)

  return (
    <div
      className={clsx(
        'rounded-md border-2 border-foreground/30 shadow-md',
        'min-h-[120px] p-4 flex flex-col gap-2 text-foreground',
      )}
      style={{ backgroundColor: color }}
    >
      <div className='flex items-start justify-between gap-2'>
        <h3 className='text-sm font-semibold leading-tight line-clamp-2' title={displayLabel}>
          {displayLabel}
        </h3>
        {status ? (
          <span className='rounded-md border border-foreground/20 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground'>
            {status}
          </span>
        ) : null}
      </div>

      {summary ? (
        <p className='text-xs text-foreground/80 line-clamp-4'>
          {summary}
        </p>
      ) : (
        <p className='text-xs text-muted-foreground italic'>No summary yet</p>
      )}

      <div className='mt-auto flex items-center justify-between gap-2'>
        <span className='text-[11px] text-muted-foreground truncate' title={mimeType || 'Unknown type'}>
          {mimeType || 'document'}
        </span>
        {timeAgo && fullDate ? (
          <span className='text-[11px] text-muted-foreground shrink-0' title={fullDate}>
            {timeAgo}
          </span>
        ) : null}
      </div>
    </div>
  )
})
