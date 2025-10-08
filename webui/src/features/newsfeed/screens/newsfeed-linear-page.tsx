import { useParams } from '@tanstack/react-router'
import { useGetNewsfeed } from '../api/get-newsfeed'
import { MarkdownView } from '@/components/markdown/markdown-view'
import { ErrorWindow, ProgressBar } from '@/components/progress-bar'


/**
 * NewsfeedLinearPage shows a single newsfeed in a linear view.
 */
export function NewsfeedLinearPage() {
  const params = useParams({ from: '/subscriptions/$id/newsfeeds/$newsfeedId', shouldThrow: false })
  const subscriptionId = params?.id
  const newsfeedId = params?.newsfeedId

  const nf = useGetNewsfeed(subscriptionId, newsfeedId)

  const markdown = nf.data?.content?.markdown ?? ''

  return (
    <div className='absolute inset-0 w-full h-full flex flex-col'>
      <h1 className='relative text-xl font-semibold w-full text-center text-secondary z-50 mt-4'>Newsfeed</h1>
      <div className='relative w-full flex-1 h-full'>
        <div className='w-full h-full absolute inset-0 overflow-x-hidden overflow-y-auto scrollbar-thin flex flex-col items-center p-4 pb-16 space-y-4 z-10'>
          {nf.isLoading && <ProgressBar message="Loading…" viewMode="full" className='bg-transparent' />}
          {nf.isError && <ErrorWindow message="Failed to load newsfeed" viewMode="full" className='bg-transparent' />}
          {markdown && (
            <div className='prose max-w-[800px]'>
              <MarkdownView content={markdown} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
