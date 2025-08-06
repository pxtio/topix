import { create } from "zustand"
import type { Note } from "../types/note"
import type { Link } from "../types/link"


export interface BoardStore {
  currentBoardId?: string
  setCurrentBoardId: (boardId?: string) => void

  // notes & links
  notes: Map<string, Note>
  links: Map<string, Link>

  setNotes: (notes: Map<string, Note>) => void
  setLinks: (links: Map<string, Link>) => void

  addNote: (note: Note) => void
  addLink: (link: Link) => void

  updateNote: (noteId: string, noteData: Partial<Note>) => void
  updateLink: (linkId: string, linkData: Partial<Link>) => void

  deleteNote: (noteId: string) => void
  deleteLink: (linkId: string) => void

  resetNotes: () => void
  resetLinks: () => void
}


export const useBoardStore = create<BoardStore>((set) => ({
  currentBoardId: undefined,

  setCurrentBoardId: (boardId?: string) => set(() => ({ currentBoardId: boardId })),

  notes: new Map<string, Note>(),
  links: new Map<string, Link>(),

  setNotes: (notes: Map<string, Note>) => set(() => ({ notes })),
  setLinks: (links: Map<string, Link>) => set(() => ({ links })),

  updateNote: (noteId: string, noteData: Partial<Note>) => set((state) => {
    const updatedNotes = new Map(state.notes)
    const existingNote = updatedNotes.get(noteId)

    if (existingNote) {
      updatedNotes.set(noteId, { ...existingNote, ...noteData, updatedAt: new Date().toISOString() })
    }

    return { notes: updatedNotes }
  }),

  updateLink: (linkId: string, linkData: Partial<Link>) => set((state) => {
    const updatedLinks = new Map(state.links)
    const existingLink = updatedLinks.get(linkId)

    if (existingLink) {
      updatedLinks.set(linkId, { ...existingLink, ...linkData, updatedAt: new Date().toISOString() })
    }

    return { links: updatedLinks }
  }),

  addNote: (note: Note) => set((state) => {
    const updatedNotes = new Map(state.notes)
    updatedNotes.set(note.id, note)
    return { notes: updatedNotes }
  }),

  addLink: (link: Link) => set((state) => {
    const updatedLinks = new Map(state.links)
    updatedLinks.set(link.id, link)
    return { links: updatedLinks }
  }),

  deleteNote: (noteId: string) => set((state) => {
    const updatedNotes = new Map(state.notes)
    const toDelete = updatedNotes.get(noteId)
    if (!toDelete) return state
    toDelete.deletedAt = new Date().toISOString()
    return { notes: updatedNotes }
  }),

  deleteLink: (linkId: string) => set((state) => {
    const updatedLinks = new Map(state.links)
    updatedLinks.delete(linkId)
    return { links: updatedLinks }
  }),

  resetNotes: () => set(() => ({ notes: new Map<string, Note>() })),
  resetLinks: () => set(() => ({ links: new Map<string, Link>() }))
}))