import { useParams } from '@tanstack/react-router'
import { useGetNewsfeed } from '../api/get-newsfeed'
import { MarkdownView } from '@/components/markdown/markdown-view'

export function NewsfeedLinearPage() {
  const params = useParams({ from: '/subscriptions/$id/newsfeeds/$newsfeedId', shouldThrow: false })
  const subscriptionId = params?.id
  const newsfeedId = params?.newsfeedId

  const nf = useGetNewsfeed(subscriptionId, newsfeedId)

  const markdown = nf.data?.content?.markdown ?? ''

  return (
    <div className='p-6 space-y-4 w-full h-full overflow-x-hidden overflow-y-auto scrollbar-thin'>
      <h1 className='text-xl font-semibold'>Newsfeed</h1>
      {nf.isLoading && <div className='text-sm text-muted-foreground'>Loading…</div>}
      {nf.isError && <div className='text-sm text-destructive'>Failed to load newsfeed</div>}
      {markdown && (
        <div className='prose max-w-[800px]'>
          <MarkdownView content={markdown} />
        </div>
      )}
    </div>
  )
}
