import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { matchPredefined, PREDEFINED_TOPICS, TOPIC_DISPLAY, TOPIC_EMOJI } from '../constants/topics'
import { useCreateSubscription } from '../api/create-subscription'
import { useCreateNewsfeed } from '../api/create-newsfeed'
import { SubscriptionCardLoading } from './subscription-card'
import { generateUuid } from '@/lib/common'
import { HugeiconsIcon } from '@hugeicons/react'
import { Tick01Icon } from '@hugeicons/core-free-icons'

type Step = 'topic' | 'description' | 'creating'

export function CreateSubscriptionDialog({
  afterCreate,
  trigger
}: {
  afterCreate?: () => void
  trigger?: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<Step>('topic')
  const [topic, setTopic] = useState<string>('')
  const [desc, setDesc] = useState<string>("")

  const createSub = useCreateSubscription()
  const createFeed = useCreateNewsfeed(undefined)

  const reset = () => {
    setStep('topic')
    setTopic('')
    setDesc("")
  }

  const nextFromTopic = () => {
    if (!topic.trim()) return
    setStep('description')
  }

  const submit = async () => {
    const subUid = generateUuid()
    setStep('creating')

    await createSub.mutateAsync({
      topic: topic.trim(),
      rawDescription: desc,
      uid: subUid
    })

    // kick off first newsfeed generation (no redirect)
    createFeed.mutate({ uid: generateUuid(), subscriptionIdOverride: subUid })

    setOpen(false)
    reset()
    afterCreate?.()
  }

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
            {step === 'topic' && 'Enter a topic of your choice'}
            {step === 'description' && 'Describe your topic'}
            {step === 'creating' && 'Creating subscription'}
          </DialogTitle>
        </DialogHeader>

        {step === 'topic' && (
          <div className='space-y-4'>
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
                        ? <HugeiconsIcon icon={Tick01Icon} strokeWidth={1.75} className='w-4 h-4' />
                        : <HugeiconsIcon icon={TOPIC_EMOJI[k]} strokeWidth={1.75} className='w-4 h-4' />
                      }
                    </span>
                    {label}
                  </Badge>
                )
              })}
            </div>
            <div className='flex items-center justify-center'>
              <Button
                onClick={nextFromTopic}
                disabled={!topic.trim()}
                variant={!topic.trim() ? 'ghost' : 'default'}
                className='transition-all rounded-lg'
              >
                Validate
              </Button>
            </div>
          </div>
        )}

        {step === 'description' && (
          <div className='space-y-4'>
            <Textarea
              rows={6}
              value={desc}
              onChange={e => setDesc(e.target.value)}
              className='resize-none focus-visible:ring-2 focus-visible:ring-secondary/20 focus-visible:border-secondary transition-all'
              placeholder='Describe your topic in more details'
            />
            <div className='flex justify-end gap-2'>
              <Button variant='ghost' onClick={() => setStep('topic')}>Back</Button>
              <Button onClick={submit}>Validate</Button>
            </div>
          </div>
        )}

        {step === 'creating' && (
          <div className='flex justify-center'>
            <SubscriptionCardLoading />
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}