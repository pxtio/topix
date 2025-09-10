import { Oc } from "@/components/oc"

export const WelcomeMessage = () => {
  return (
    <div className='relative w-full h-72 flex flex-col items-center justify-center'>
      <Oc/>
      <div className='absolute bottom-10 inset-x-0text-center text-xl text-card-foreground'>
        <span>Ask me anything — I'll sniff out the answer!</span>
      </div>
    </div>
  )
}