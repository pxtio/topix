import { useMemo, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { matchPredefined, PREDEFINED_TOPICS, TOPIC_DISPLAY, TOPIC_EMOJI } from '../constants/topics'
import { useCreateSubscription } from '../api/create-subscription'
import { useCreateNewsfeed } from '../api/create-newsfeed'
import { generateUuid } from '@/lib/common'
import { HugeiconsIcon } from '@hugeicons/react'
import { Tick01Icon } from '@hugeicons/core-free-icons'

type Step = 'editing' | 'creating'

export function CreateSubscriptionDialog({
  afterCreate,
  trigger
}: {
  afterCreate?: () => void
  trigger?: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<Step>('editing')
  const [topic, setTopic] = useState<string>('')
  const [desc, setDesc] = useState<string>('')

  const matched = useMemo(() => matchPredefined(topic), [topic])

  const createSub = useCreateSubscription()
  const createFeed = useCreateNewsfeed(undefined)

  const reset = () => {
    setStep('editing')
    setTopic('')
    setDesc('')
  }

  const submit = () => {
    if (!topic.trim()) return
    const subUid = generateUuid()

    // close right away — onOpenChange handler will reset the form
    setOpen(false)

    // create subscription in background
    createSub.mutate(
      { topic: topic.trim(), rawDescription: desc, uid: subUid },
      {
        onSuccess: () => {
          // once sub exists, kick off first newsfeed
          createFeed.mutate({ uid: generateUuid(), subscriptionIdOverride: subUid })
          afterCreate?.()
        }
        // optionally add onError to show a toast/snackbar
      }
    )
  }

  const disabledCreate = !topic.trim()

  return (
    <Dialog open={open} onOpenChange={o => { setOpen(o); if (!o) reset() }}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size='sm' className='rounded-full'>Add new subscription</Button>
        )}
      </DialogTrigger>

      <DialogContent className='sm:max-w-xl'>
        <DialogHeader className='w-full flex flex-row items-center justify-center'>
          <DialogTitle>
            {step === 'editing' && 'Create a new Topic subscription'}
            {step === 'creating' && 'Creating subscription'}
          </DialogTitle>
        </DialogHeader>

        {step === 'editing' && (
          <div className='space-y-5'>
            {/* Topic */}
            <div className='space-y-2'>
              <label className='text-sm font-medium'>Topic</label>
              <Input
                placeholder='custom topic'
                value={topic}
                onChange={e => setTopic(e.target.value)}
                className='focus-visible:ring-2 focus-visible:ring-secondary/20 focus-visible:border-secondary transition-all'
              />
              <div className='flex flex-wrap gap-2'>
                {PREDEFINED_TOPICS.map(k => {
                  const label = TOPIC_DISPLAY[k]
                  const active = (matchPredefined(topic) === k)
                  return (
                    <Badge
                      key={k}
                      className={[
                        'cursor-pointer select-none p-2 rounded-lg border border-border',
                        active
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-card text-card-foreground backdrop-blur hover:bg-accent transition-all'
                      ].join(' ')}
                      variant={active ? 'default' : 'secondary'}
                      onClick={() => setTopic(k)}
                    >
                      <span className='inline-flex items-center gap-1'>
                        {active
                          ? <HugeiconsIcon icon={Tick01Icon} strokeWidth={2} className='w-4 h-4' />
                          : <HugeiconsIcon icon={TOPIC_EMOJI[k]} strokeWidth={2} className='w-4 h-4' />
                        }
                      </span>
                      {label}
                    </Badge>
                  )
                })}
              </div>
              <div className='text-xs text-muted-foreground'>
                {matched ? `Matched to: ${TOPIC_DISPLAY[matched]}` : 'Custom topic'}
              </div>
            </div>

            {/* Description */}
            <div className='space-y-2'>
              <label className='text-sm font-medium'>Description (optional)</label>
              <Textarea
                rows={6}
                value={desc}
                onChange={e => setDesc(e.target.value)}
                className='resize-none focus-visible:ring-2 focus-visible:ring-secondary/20 focus-visible:border-secondary transition-all'
                placeholder='Describe your topic in more details'
              />
              <div className='text-xs text-muted-foreground'>
                Add a few lines to improve results (sources, sub-topics, exclusions…)
              </div>
            </div>

            {/* Actions */}
            <div className='flex justify-end gap-2'>
              <Button variant='ghost' onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={submit} disabled={disabledCreate} className='rounded-lg'>
                Create
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}