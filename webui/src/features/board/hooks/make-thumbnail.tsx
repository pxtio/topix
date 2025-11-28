import { useEffect } from "react"
import * as htmlToImage from "html-to-image"
import { saveThumbnail } from "../api/save-thumbnail";


export function useSaveThumbnailOnUnmount(boardId: string) {
  useEffect(() => {
    if (!boardId) return

    let hasRun = false

    const generateAndSave = async () => {
      if (hasRun) return
      hasRun = true
      const el = document.querySelector(
        ".react-flow__renderer"
      ) as HTMLElement | null

      if (!el) return

      try {
        // current view only, no fitView, cheap capture
        const dataUrl = await htmlToImage.toPng(el, {
          cacheBust: true,
          pixelRatio: 1, // fine for thumbnails
        })

        const res = await fetch(dataUrl)
        const blob = await res.blob()

        await saveThumbnail({ boardId, blob })
      } catch (err) {
        console.error("[useSaveThumbnailOnUnmount] failed", err)
      }
    }

    return () => {
      // fire once on unmount
      void generateAndSave()
    }
  }, [boardId])
}