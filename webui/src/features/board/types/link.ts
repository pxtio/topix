import { generateUuid } from "@/lib/common"
import { createDefaultStyle, type Style } from "./style"


/**
 * Interface for a link between nodes in the board.
 */
export interface Link extends Record<string, unknown> {
  id: string
  type: "link"
  version: number

  source: string
  target: string
  label?: string
  style: Style

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
  source,
  target,
  style: createDefaultStyle({}),
  createdAt: new Date().toISOString(),
  graphUid: boardId,
})
