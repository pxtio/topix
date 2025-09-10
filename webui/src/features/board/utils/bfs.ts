import { pickRandomColorOfShade, TailwindShades, type TailwindShade } from "../lib/colors/tailwind"
import type { Link } from "../types/link"
import type { Note } from "../types/note"


/**
 * Color a tree of notes based on their depth using BFS.
 *
 * This function assumes the notes and links form a valid tree structure.
 *
 * @param notes - Array of Note objects to color
 * @param links - Array of Link objects defining parent-child relationships
 */
export function colorTree({ notes, links }: { notes: Note[], links: Link[] }) {
  const noteMap = new Map<string, Note>()
  const parentMap = new Map<string, string>()

  notes.forEach(note => noteMap.set(note.id, note))
  links.forEach(link => {
    parentMap.set(link.target, link.source)
  })

  if (notes.length === 0) return

  // find root node
  let root = notes[0].id
  while (parentMap.has(root)) {
    root = parentMap.get(root)!
  }

  // bfs to color nodes by depth
  const queue: { id: string, depth: number }[] = [{ id: root, depth: 1 }]
  const visited = new Set<string>()

  while (queue.length > 0) {
    const { id, depth } = queue.shift()!
    if (visited.has(id)) continue
    visited.add(id)

    const note = noteMap.get(id)!

    const shade = TailwindShades[depth % TailwindShades.length] as TailwindShade

    note.style.backgroundColor = pickRandomColorOfShade(shade)?.hex || note.style.backgroundColor
    note.style.textColor = shade >= 500 ? '#ffffff' : '#000000'

    // enqueue children
    links.forEach(link => {
      if (link.source === id) {
        queue.push({ id: link.target, depth: depth + 1 })
      }
    })
  }
}
