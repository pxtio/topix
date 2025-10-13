// src/features/newsfeed/components/info.tsx
import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'

import { useGetSubscription } from '@/features/newsfeed/api/get-subscription'
import { useUpdateSubscription } from '@/features/newsfeed/api/update-subscription'
import type { Subscription } from '@/features/newsfeed/types/subscription'

import { HugeiconsIcon } from '@hugeicons/react'
import {
  Edit02Icon,
  Tick01Icon,
  PlusSignIcon,
  Delete02Icon,
  Cancel01Icon
} from '@hugeicons/core-free-icons'

type Editing = {
  title?: boolean
  description?: boolean
  keywords?: boolean
  seed?: boolean
}

const EMPTY_ARR: string[] = []

// helper: deep-merge a single property into existing properties
function mergeProps<T extends Subscription>(
  current: T | undefined,
  patch: Partial<NonNullable<T['properties']>>
): NonNullable<T['properties']> {
  const base = (current?.properties ?? {}) as NonNullable<T['properties']>
  return { ...base, ...patch }
}

export function SubscriptionInfoPanel({
  subscriptionId
}: {
  subscriptionId: string
}) {
  const subQ = useGetSubscription(subscriptionId)
  const update = useUpdateSubscription()

  // derive current values
  const current = subQ.data
  const title = useMemo(
    () => (typeof current?.label === 'string' ? current?.label : current?.label?.markdown) ?? '',
    [current?.label]
  )
  const description = current?.properties?.description?.text ?? ''
  const keywords = current?.properties?.keywords?.texts ?? EMPTY_ARR
  const seedSources = current?.properties?.seedSources?.texts ?? EMPTY_ARR

  // local edit states
  const [editing, setEditing] = useState<Editing>({})
  const [titleVal, setTitleVal] = useState(title)
  const [descVal, setDescVal] = useState(description)
  const [kwVal, setKwVal] = useState<string[]>(keywords)
  const [kwInput, setKwInput] = useState('')
  const [seedVal, setSeedVal] = useState<string[]>(seedSources)
  const [seedInput, setSeedInput] = useState('')

  // keep local state in sync when refetched
  useEffect(() => setTitleVal(title), [title])
  useEffect(() => setDescVal(description), [description])
  useEffect(() => setKwVal(keywords), [keywords])
  useEffect(() => setSeedVal(seedSources), [seedSources])

  const saving = update.isPending

  // helpers
  const openEdit = (key: keyof Editing) => setEditing(s => ({ ...s, [key]: true }))
  const cancelEdit = (key: keyof Editing) => {
    if (key === 'title') setTitleVal(title)
    if (key === 'description') setDescVal(description)
    if (key === 'keywords') { setKwVal(keywords); setKwInput('') }
    if (key === 'seed') { setSeedVal(seedSources); setSeedInput('') }
    setEditing(s => ({ ...s, [key]: false }))
  }

  const saveEdit = async (key: keyof Editing) => {
    const payload: Partial<Subscription> = {}

    if (key === 'title') {
      payload.label = { markdown: titleVal.trim() }
    }

    if (key === 'description') {
      const merged = mergeProps(current, {
        description: {
          ...(current?.properties?.description ?? { type: 'text' }),
          text: descVal
        }
      })
      payload.properties = merged
    }

    if (key === 'keywords') {
      const merged = mergeProps(current, {
        keywords: {
          ...(current?.properties?.keywords ?? { type: 'multi_text' }),
          texts: kwVal.filter(Boolean)
        }
      })
      payload.properties = merged
    }

    if (key === 'seed') {
      const merged = mergeProps(current, {
        seedSources: {
          ...(current?.properties?.seedSources ?? { type: 'multi_text' }),
          texts: seedVal.filter(Boolean)
        }
      })
      payload.properties = merged
    }

    try {
      await update.mutateAsync({
        subscriptionId,
        data: payload
      })
      setEditing(s => ({ ...s, [key]: false }))
    } catch {
      // optional: toast error
    }
  }

  // inputs actions
  const addKeyword = () => {
    const v = kwInput.trim()
    if (!v) return
    if (!kwVal.includes(v)) setKwVal(prev => [...prev, v])
    setKwInput('')
  }
  const removeKeyword = (k: string) => setKwVal(prev => prev.filter(x => x !== k))

  const addSeed = () => {
    const v = seedInput.trim()
    if (!v) return
    setSeedVal(prev => [...prev, v])
    setSeedInput('')
  }
  const removeSeed = (u: string) => setSeedVal(prev => prev.filter(x => x !== u))

  return (
    <div className='w-full mx-auto max-w-3xl flex flex-col gap-2 items-center pt-8'>
      {/* Title */}
      <Section title='Title'>
        <Box
          editing={!!editing.title}
          onEdit={() => openEdit('title')}
          onCancel={() => cancelEdit('title')}
          onSave={() => saveEdit('title')}
          saving={saving}
        >
          {!editing.title ? (
            <div className='px-3 py-2 text-sm truncate rounded-md border border-border bg-accent font-medium'>
              {title || 'Untitled'}
            </div>
          ) : (
            <div className='flex items-center gap-2'>
              <Input
                value={titleVal}
                onChange={e => setTitleVal(e.target.value)}
                placeholder='Topic title'
                className='focus-visible:ring-2 focus-visible:ring-secondary/50 focus-visible:border-secondary border border-border font-medium'
              />
            </div>
          )}
        </Box>
      </Section>

      <div className='w-px h-12 bg-border' />

      {/* Description */}
      <Section title='Description'>
        <Box
          editing={!!editing.description}
          onEdit={() => openEdit('description')}
          onCancel={() => cancelEdit('description')}
          onSave={() => saveEdit('description')}
          saving={saving}
        >
          {!editing.description ? (
            <p className='py-2 px-3 text-sm text-muted-foreground whitespace-pre-wrap min-h-24 rounded-md border border-border bg-accent'>
              {descVal || '—'}
            </p>
          ) : (
            <Textarea
              rows={6}
              value={descVal}
              onChange={e => setDescVal(e.target.value)}
              placeholder='Describe your topic…'
              className='border border-border resize-none focus-visible:ring-2 focus-visible:ring-secondary/50 focus-visible:border-secondary'
            />
          )}
        </Box>
      </Section>

      <div className='w-px h-12 bg-border' />

      {/* Keywords */}
      <Section title='Keywords'>
        <Box
          editing={!!editing.keywords}
          onEdit={() => openEdit('keywords')}
          onCancel={() => cancelEdit('keywords')}
          onSave={() => saveEdit('keywords')}
          saving={saving}
        >
          {!editing.keywords ? (
            <div className='flex flex-wrap gap-2'>
              {(kwVal.length ? kwVal : ['—']).map(k => (
                k === '—'
                  ? <span key='empty' className='text-sm text-muted-foreground'>—</span>
                  : <Badge key={k} variant='outline' className='px-2 py-1 h-7 rounded-md bg-accent font-mono'>{k}</Badge>
              ))}
            </div>
          ) : (
            <div className='space-y-3'>
              <div className='flex flex-wrap gap-2'>
                {kwVal.map(k => (
                  <Badge key={k} variant='outline' className='px-2 py-1 h-7 rounded-md flex flex-row items-center gap-1 font-mono'>
                    {k}
                    <button
                      type='button'
                      onClick={() => removeKeyword(k)}
                      title='Remove'
                      className='transition-all hover:bg-muted p-1 rounded-full -mr-1'
                    >
                      <HugeiconsIcon icon={Delete02Icon} className='size-3' strokeWidth={2} />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className='flex items-center gap-2'>
                <Input
                  value={kwInput}
                  onChange={e => setKwInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') addKeyword() }}
                  placeholder='Add keyword and press Enter'
                  className='focus-visible:ring-2 focus-visible:ring-secondary/50 focus-visible:border-secondary border border-border font-mono'
                />
                <Button type='button' size='icon' onClick={addKeyword}>
                  <HugeiconsIcon icon={PlusSignIcon} className='size-4' strokeWidth={2} />
                </Button>
              </div>
            </div>
          )}
        </Box>
      </Section>

      <div className='w-px h-12 bg-border' />

      {/* Seed sources */}
      <Section title='Seed sources'>
        <Box
          editing={!!editing.seed}
          onEdit={() => openEdit('seed')}
          onCancel={() => cancelEdit('seed')}
          onSave={() => saveEdit('seed')}
          saving={saving}
        >
          {!editing.seed ? (
            <div className='space-y-2'>
              {seedVal.length ? seedVal.map(u => (
                <div key={u} className='text-sm truncate px-3 py-2 border border-border bg-accent rounded-md font-mono'>{u}</div>
              )) : <div className='text-sm text-muted-foreground'>—</div>}
            </div>
          ) : (
            <div className='space-y-3'>
              <div className='space-y-2'>
                {seedVal.map(u => (
                  <div key={u} className='flex items-center gap-2'>
                    <Input
                      value={u}
                      onChange={e => {
                        const v = e.target.value
                        setSeedVal(prev => prev.map(x => x === u ? v : x))
                      }}
                      className='focus-visible:ring-2 focus-visible:ring-secondary/50 focus-visible:border-secondary min-w-[300px] border border-border font-mono text-sm'
                    />
                    <Button type='button' variant='ghost' size='icon' onClick={() => removeSeed(u)}>
                      <HugeiconsIcon icon={Delete02Icon} className='size-4' strokeWidth={2} />
                    </Button>
                  </div>
                ))}
              </div>
              <div className='flex items-center gap-2'>
                <Input
                  value={seedInput}
                  onChange={e => setSeedInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') addSeed() }}
                  placeholder='Add a source URL then Enter'
                  className='focus-visible:ring-2 focus-visible:ring-secondary/50 focus-visible:border-secondary border border-border font-mono text-sm'
                />
                <Button type='button' size='icon' onClick={addSeed}>
                  <HugeiconsIcon icon={PlusSignIcon} className='size-4' strokeWidth={2} />
                </Button>
              </div>
            </div>
          )}
        </Box>
      </Section>
    </div>
  )
}

/* ---------- UI primitives ---------- */

function Section({ title, children }: { title: string, children: React.ReactNode }) {
  return (
    <div className='space-y-1 -mt-2'>
      <h3 className='text-center text-lg font-semibold text-muted-foreground'>{title}</h3>
      {children}
    </div>
  )
}

function Box({
  children,
  editing,
  onEdit,
  onCancel,
  onSave,
  saving
}: {
  children: React.ReactNode
  editing: boolean
  onEdit: () => void
  onCancel: () => void
  onSave: () => void
  saving?: boolean
}) {
  return (
    <div className='flex flex-col items-center'>
      <div className='space-x-1'>
        {
          !editing ? (
          <Button
            variant='ghost'
            size='icon'
            onClick={onEdit}
            title='Edit'
            aria-label='Edit'
            className='rounded-full !p-1 bg-accent border border-border'
          >
            <HugeiconsIcon icon={Edit02Icon} className='size-3' strokeWidth={2} />
          </Button>
        ) : (
          <>
            <Button
              variant='ghost'
              size='icon'
              onClick={onCancel}
              title='Cancel'
              aria-label='Cancel'
              disabled={saving}
              className='rounded-full !p-1 border border-border'
            >
              <HugeiconsIcon icon={Cancel01Icon} className='size-3' strokeWidth={2} />
            </Button>
            <Button
              size='icon'
              onClick={onSave}
              title='Save'
              aria-label='Save'
              disabled={saving}
              className='bg-primary text-primary-foreground hover:opacity-90 rounded-full !p-1'
            >
              <HugeiconsIcon icon={Tick01Icon} className='size-3' strokeWidth={2} />
            </Button>
          </>
        )}
      </div>
      <div className='pt-2'>
        {children}
      </div>
    </div>
  )
}