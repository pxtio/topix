import { memo, useCallback, useEffect, useState } from "react"

import { Cancel01Icon, Layout01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useTheme } from "@/components/theme-provider"

import { useGraphStore } from "../../store/graph-store"
import { CodeArea } from "./code-area"
import { WidgetIframe } from "./widget-iframe"


type WidgetDialogProps = {
  nodeId: string
}


/**
 * Dialog for previewing and editing widget HTML in one place.
 */
export const WidgetDialog = memo(function WidgetDialog({
  nodeId,
}: WidgetDialogProps) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === "dark"
  const note = useGraphStore((state) => state.nodesById.get(nodeId)?.data)
  const updateNodeByIdPersist = useGraphStore((state) => state.updateNodeByIdPersist)
  const closeNodeSurface = useGraphStore((state) => state.closeNodeSurface)
  const [activeTab, setActiveTab] = useState("rendered")
  const [htmlDraft, setHtmlDraft] = useState(note?.content?.markdown || "")

  useEffect(() => {
    setHtmlDraft(note?.content?.markdown || "")
  }, [note?.content?.markdown, nodeId])

  useEffect(() => {
    if (!note) return

    const timer = window.setTimeout(() => {
      updateNodeByIdPersist(note.id, (node) => ({
        ...node,
        data: {
          ...node.data,
          content: { markdown: htmlDraft },
        },
      }))
    }, 250)

    return () => window.clearTimeout(timer)
  }, [htmlDraft, note, updateNodeByIdPersist])

  const handleOpenChange = useCallback((open: boolean) => {
    if (!open) {
      closeNodeSurface()
    }
  }, [closeNodeSurface])

  if (!note) return null

  const html = htmlDraft.trim()

  return (
    <Dialog open onOpenChange={handleOpenChange}>
      <DialogContent
        className="sm:max-w-5xl h-[85vh] p-0 gap-0 overflow-hidden flex flex-col"
        showCloseButton={false}
      >
        <DialogTitle className="sr-only">Widget</DialogTitle>
        <div className="flex items-center justify-between border-b border-border/70 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <HugeiconsIcon icon={Layout01Icon} className="size-4 shrink-0" strokeWidth={2} />
            <span className="truncate text-sm font-semibold">Widget</span>
          </div>
          <Button variant="ghost" size="icon-sm" onClick={() => handleOpenChange(false)} title="Close" aria-label="Close">
            <HugeiconsIcon icon={Cancel01Icon} className="size-4" strokeWidth={2} />
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="min-h-0 flex-1 gap-0">
          <div className="border-b border-border/70 px-4 py-2">
            <TabsList>
              <TabsTrigger value="rendered">Rendered</TabsTrigger>
              <TabsTrigger value="code">Code</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="rendered" className="min-h-0 flex-1 bg-background m-0">
            {html ? (
              <WidgetIframe
                html={html}
                title="Widget"
                className="h-full w-full border-0 bg-white"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center px-6 text-center text-sm text-muted-foreground">
                Widget HTML is empty.
              </div>
            )}
          </TabsContent>

          <TabsContent value="code" className="min-h-0 flex-1 bg-background m-0">
            <CodeArea
              value={htmlDraft}
              isDark={isDark}
              textColor="var(--foreground)"
              onChange={setHtmlDraft}
              language="html"
              placeholder={`<!doctype html>
<html>
  <body>
    <h1>Hello widget</h1>
  </body>
</html>`}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
})
