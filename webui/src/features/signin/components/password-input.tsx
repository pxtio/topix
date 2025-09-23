import * as React from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { HugeiconsIcon } from "@hugeicons/react"
import { ViewIcon, ViewOffSlashIcon } from "@hugeicons/core-free-icons"

type Props = React.ComponentProps<typeof Input>

export function PasswordInput(props: Props) {
  const [show, setShow] = React.useState(false)

  return (
    <div className="relative">
      <Input
        type={show ? "text" : "password"}
        {...props}
        className={`pr-9 ${props.className ?? ""}`}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => setShow((v) => !v)}
        className="absolute right-1.5 top-1.5 h-7 w-7 rounded-lg text-muted-foreground"
        tabIndex={-1}
      >
        {show ? (
          <HugeiconsIcon
            icon={ViewOffSlashIcon}
            className="h-4 w-4"
            strokeWidth={1.75}
          />
        ) : (
          <HugeiconsIcon
            icon={ViewIcon}
            className="h-4 w-4"
            strokeWidth={1.75}
          />
        )}
      </Button>
    </div>
  )
}