import { create } from "zustand"
import type { Note } from "../types/note"
import type { Link } from "../types/link"


export interface BoardStore {
  currentBoardId?: string
  modifiedNotes: Map<string, Note>
  modifiedLinks: Map<string, Link>
  setCurrentBoardId: (boardId?: string) => void
  // add new note or link to the store
  addNote: (note: Note) => void
  addLink: (link: Link) => void
  // update a note or link in the store
  updateNote: (noteId: string, noteData: Partial<Note>) => void
  updateLink: (linkId: string, linkData: Partial<Link>) => void
  // reset modified notes and links
  resetModifiedNotes: () => void
  resetModifiedLinks: () => void
  // Reset the entire store to its initial state
  // Useful for clearing the store when switching boards or resetting the application
  resetStore: () => void
}


export const useBoardStore = create<BoardStore>((set) => ({
  currentBoardId: undefined,
  modifiedNotes: new Map<string, Note>(),
  modifiedLinks: new Map<string, Link>(),

  setCurrentBoardId: (boardId?: string) => set(() => ({ currentBoardId: boardId })),
  updateNote: (noteId: string, noteData: Partial<Note>) => set((state) => {
    const updatedNotes = new Map(state.modifiedNotes)
    const existingNote = updatedNotes.get(noteId)

    if (existingNote) {
      updatedNotes.set(noteId, { ...existingNote, ...noteData })
    }

    return { modifiedNotes: updatedNotes }
  }),
  updateLink: (linkId: string, linkData: Partial<Link>) => set((state) => {
    const updatedLinks = new Map(state.modifiedLinks)
    const existingLink = updatedLinks.get(linkId)

    if (existingLink) {
      updatedLinks.set(linkId, { ...existingLink, ...linkData })
    }

    return { modifiedLinks: updatedLinks }
  }),

  addNote: (note: Note) => set((state) => {
    const updatedNotes = new Map(state.modifiedNotes)
    updatedNotes.set(note.id, note)
    return { modifiedNotes: updatedNotes }
  }),
  addLink: (link: Link) => set((state) => {
    const updatedLinks = new Map(state.modifiedLinks)
    updatedLinks.set(link.id, link)
    return { modifiedLinks: updatedLinks }
  }),

  resetModifiedNotes: () => set(() => ({ modifiedNotes: new Map<string, Note>() })),
  resetModifiedLinks: () => set(() => ({ modifiedLinks: new Map<string, Link>() })),

  resetStore: () => set(() => ({
    currentBoardId: undefined,
    modifiedNotes: new Map<string, Note>(),
    modifiedLinks: new Map<string, Link>()
  }))
}))