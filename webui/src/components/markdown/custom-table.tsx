import * as React from 'react'
import { cn } from '@/lib/utils'

let __tblScrollInjected = false

function ensureScrollCSS() {
  if (__tblScrollInjected) return
  const style = document.createElement('style')
  style.setAttribute('data-tbl-scroll', 'true')
  style.innerHTML = `
    /* Firefox */
    .mk-tbl-scroll { scrollbar-width: thin; scrollbar-color: rgba(120,120,130,.5) transparent }
    /* WebKit */
    .mk-tbl-scroll::-webkit-scrollbar { height: 10px; width: 10px }
    .mk-tbl-scroll::-webkit-scrollbar-track { background: transparent }
    .mk-tbl-scroll::-webkit-scrollbar-thumb { background: rgba(120,120,130,.5); border-radius: 9999px }
    .mk-tbl-scroll::-webkit-scrollbar-thumb:hover { background: rgba(120,120,130,.7) }
  `
  document.head.appendChild(style)
  __tblScrollInjected = true
}

type CustomTableProps = React.HTMLAttributes<HTMLTableElement> & {
  wrapperClassName?: string
}

export const CustomTable: React.FC<CustomTableProps> = ({
  className,
  wrapperClassName,
  ...props
}) => {
  React.useEffect(() => {
    ensureScrollCSS()
  }, [])

  return (
    <div
      className={cn(
        'mk-tbl-scroll my-6 w-full max-w-full overflow-x-auto overflow-y-hidden overscroll-x-contain',
        wrapperClassName
      )}
      role='region'
      aria-label='Table container'
    >
      <table
        className={cn(
          'text-base border-b w-max max-w-none min-w-[480px] md:min-w-[640px]',
          className
        )}
        {...props}
      />
    </div>
  )
}