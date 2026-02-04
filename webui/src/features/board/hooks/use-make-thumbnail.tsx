import * as htmlToImage from "html-to-image"
import { saveThumbnail } from "../api/save-thumbnail"

export async function saveThumbnailFromViewport(boardId: string) {
  if (!boardId) return
  const el = document.querySelector(".react-flow__viewport") as HTMLElement | null
  if (!el) return

  try {
    const dataUrl = await htmlToImage.toPng(el, {
      cacheBust: true,
      pixelRatio: 0.1,
    })

    const res = await fetch(dataUrl)
    const blob = await res.blob()

    await saveThumbnail({ boardId, blob })
  } catch (err) {
    console.error("[saveThumbnailFromViewport] failed", err)
  }
}
