import { LinearView } from './flow/linear-view'


export const DefaultBoardView = () => {
  return (
    <div className='absolute inset h-full w-full min-h-0 overflow-y-auto overflow-x-hidden scrollbar-thin'>
      <div className='w-full flex flex-col items-center gap-4 py-6 pb-20 pt-20'>
        <LinearView cols={3} />
      </div>
    </div>
  )
}
