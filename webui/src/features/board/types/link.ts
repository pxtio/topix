import { generateUuid } from "@/lib/common"
import { createDefaultLinkStyle, type LinkStyle } from "./style"
import type { RichText } from "./note"


/**
 * Interface for properties of a link.
 */
export interface LinkProperties {
  edgeControlPoint: {
    type: "position",
    position?: { x: number; y: number }
  }
}

export const createDefaultLinkProperties = (): LinkProperties => ({
  edgeControlPoint: {
    type: "position"
  }
})


/**
 * Interface for a link between nodes in the board.
 */
export interface Link extends Record<string, unknown> {
  id: string
  type: "link"
  version: number

  properties: LinkProperties

  sourcePointId?: string
  targetPointId?: string
  sourcePointPos?: { x: number; y: number }
  targetPointPos?: { x: number; y: number }

  source: string
  target: string
  label?: RichText
  style: LinkStyle

  createdAt: string
  updatedAt?: string
  deletedAt?: string

  graphUid?: string
}


/**
 * Function to create a default link.
 *
 * @param boardId - The ID of the board to which the link belongs.
 * @param source - The ID of the source node.
 * @param target - The ID of the target node.
 * @returns A new link with default properties.
 */
export const createDefaultLink = (
  boardId: string,
  source: string,
  target: string
): Link => ({
  id: generateUuid(),
  type: "link",
  version: 1,
  properties: createDefaultLinkProperties(),
  source,
  target,
  style: createDefaultLinkStyle(),
  createdAt: new Date().toISOString(),
  graphUid: boardId,
})
