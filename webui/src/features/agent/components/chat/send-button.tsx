import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LoaderCircle, Send } from "lucide-react";
import type React from "react";


interface SendButtonProps extends React.ComponentProps<typeof Button> {
  loadingStatus?: "loaded" | "loading";
}


export function SendButton({  className,
  loadingStatus = "loaded",
  ...props
}: SendButtonProps) {
  return (
    <Button
      className={cn("rounded-full flex items-center text-xs font-medium p-2 h-auto shadow-none", className)}
      {...props}
      variant={loadingStatus === "loaded" ? 'outline' : "ghost"}
    >
      {
        loadingStatus === "loaded" ?
        <Send className="h-4 w-4 shrink-0" /> :
        <LoaderCircle className="h-4 w-4 shrink-0 animate-spin" />
      }
    </Button>
  )
}