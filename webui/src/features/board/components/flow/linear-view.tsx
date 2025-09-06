import { useMemo } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useGraphStore } from '../../store/graph-store'
import type { NoteNode } from '../../types/flow'
import { LinearNoteCard } from './linear-note-card'

/**
 * LinearView: Medium-like feed of all `sheet` notes.
 * - Sorted by data.updatedAt (most recent first)
 * - Each item is a compact card with a color dot & fade-out
 */
export function LinearView() {
  const { nodes } = useGraphStore()

  const sheets = useMemo(
    () => (nodes as NoteNode[])
      .filter(n => n.data?.style?.type === 'sheet')
      .sort((a, b) => {
        const ap = a.data.pinned ? 1 : 0
        const bp = b.data.pinned ? 1 : 0
        if (ap !== bp) return bp - ap

        const aIso = a.data.updatedAt ?? new Date().toISOString()
        const bIso = b.data.updatedAt ?? new Date().toISOString()
        // ISO-8601 strings compare lexicographically by time
        return bIso.localeCompare(aIso)
      }),
    [nodes]
  )

  return (
    <div className='w-full h-full overflow-hidden'>
      <ScrollArea className='h-full'>
        <div className='mx-auto max-w-[800px] w-full px-4 py-4 sm:py-6 pt-20 sm:pt-20 pb-20 sm:pb-20 space-y-4'>
          {sheets.map(n => (
            <LinearNoteCard key={n.id} node={n} />
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
