import * as htmlToImage from "html-to-image"
import { saveThumbnail } from "../api/save-thumbnail"
import type { NodeBounds } from "./use-thumbnail-capture"


const THUMBNAIL_SIZE = { width: 320, height: 240 }
const THUMBNAIL_PADDING = 8
const THUMBNAIL_PIXEL_RATIO = 1


const getBoundsFromNodes = (nodes: NodeBounds[]) => {
  if (!nodes.length) return null
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const node of nodes) {
    minX = Math.min(minX, node.x)
    minY = Math.min(minY, node.y)
    maxX = Math.max(maxX, node.x + node.width)
    maxY = Math.max(maxY, node.y + node.height)
  }
  return { minX, minY, maxX, maxY }
}


export async function saveThumbnailFromNodes(boardId: string, nodes: NodeBounds[]) {
  if (!boardId) return

  const container = document.createElement("div")
  container.style.position = "fixed"
  container.style.left = "0"
  container.style.top = "0"
  container.style.width = `${THUMBNAIL_SIZE.width}px`
  container.style.height = `${THUMBNAIL_SIZE.height}px`
  container.style.backgroundColor = "transparent"
  container.style.overflow = "hidden"
  container.style.borderRadius = "8px"
  container.style.pointerEvents = "none"
  container.style.zIndex = "-1"

  const bounds = getBoundsFromNodes(nodes)
  if (bounds) {
    const boundsWidth = Math.max(1, bounds.maxX - bounds.minX)
    const boundsHeight = Math.max(1, bounds.maxY - bounds.minY)
    const availableWidth = Math.max(1, THUMBNAIL_SIZE.width - THUMBNAIL_PADDING * 2)
    const availableHeight = Math.max(1, THUMBNAIL_SIZE.height - THUMBNAIL_PADDING * 2)
    const scale = Math.min(availableWidth / boundsWidth, availableHeight / boundsHeight)

    for (const node of nodes) {
      const element = document.createElement("div")
      element.style.position = "absolute"
      element.style.left = `${(node.x - bounds.minX) * scale + THUMBNAIL_PADDING}px`
      element.style.top = `${(node.y - bounds.minY) * scale + THUMBNAIL_PADDING}px`
      element.style.width = `${node.width * scale}px`
      element.style.height = `${node.height * scale}px`
      element.style.background = node.background
      element.style.border = "1px solid hsl(var(--border))"
      element.style.borderRadius = "4px"
      element.style.boxSizing = "border-box"
      container.appendChild(element)
    }
  }

  document.body.appendChild(container)

  try {
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
    const dataUrl = await htmlToImage.toPng(container, {
      cacheBust: true,
      pixelRatio: THUMBNAIL_PIXEL_RATIO,
      width: THUMBNAIL_SIZE.width,
      height: THUMBNAIL_SIZE.height,
    })
    const res = await fetch(dataUrl)

    const blob = await res.blob()

    await saveThumbnail({ boardId, blob })
    console.log("[saveThumbnailFromNodes] thumbnail saved successfully")
  } catch (err) {
    console.error("[saveThumbnailFromNodes] failed", err)
  } finally {
    container.remove()
  }
}
