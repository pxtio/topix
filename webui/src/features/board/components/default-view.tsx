import { LinearView } from './flow/linear-view'


export const DefaultBoardView = () => {
  return (
    <div className='absolute inset h-full w-full min-h-0 overflow-y-auto overflow-x-hidden scrollbar-thin'>
      <div className='w-full flex flex-col items-center gap-4 py-6 md:pb-20 md:pt-20 pt-10'>
        <LinearView cols={4} />
      </div>
    </div>
  )
}
