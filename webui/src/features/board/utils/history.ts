import type { LinkEdge, NoteNode } from '../types/flow'

export type NodePatch = {
  id: string
  before: NoteNode | null
  after: NoteNode | null
}

export type EdgePatch = {
  id: string
  before: LinkEdge | null
  after: LinkEdge | null
}

export type Patch = {
  id: string
  ts: number
  source: 'ui' | 'sync' | 'system'
  nodes?: NodePatch[]
  edges?: EdgePatch[]
}

const stripNodeUi = (node: NoteNode): NoteNode => {
  const data = node.data as { endpointActive?: boolean; isNew?: boolean } | undefined
  return {
    ...node,
    selected: false,
    dragging: undefined,
    data: data
      ? {
          ...node.data,
          endpointActive: undefined,
          isNew: undefined,
        }
      : node.data,
  }
}

const stripEdgeUi = (edge: LinkEdge): LinkEdge => ({
  ...edge,
  selected: false,
  animated: Boolean(edge.animated),
})

const normalize = (value: unknown): string => JSON.stringify(value)

export const sanitizeNodes = (nodes: NoteNode[]): NoteNode[] => nodes.map(stripNodeUi)
export const sanitizeEdges = (edges: LinkEdge[]): LinkEdge[] => edges.map(stripEdgeUi)

export const diffNodes = (prev: NoteNode[], next: NoteNode[]): NodePatch[] => {
  const prevById = new Map(prev.map(n => [n.id, stripNodeUi(n)]))
  const nextById = new Map(next.map(n => [n.id, stripNodeUi(n)]))
  const ids = new Set<string>([...prevById.keys(), ...nextById.keys()])
  const patches: NodePatch[] = []

  for (const id of ids) {
    const before = prevById.get(id) ?? null
    const after = nextById.get(id) ?? null
    if (!before && after) {
      patches.push({ id, before: null, after })
      continue
    }
    if (before && !after) {
      patches.push({ id, before, after: null })
      continue
    }
    if (before && after && normalize(before) !== normalize(after)) {
      patches.push({ id, before, after })
    }
  }

  return patches
}

export const diffNodesById = (
  prev: NoteNode[],
  next: NoteNode[],
  ids: Set<string>,
): NodePatch[] => {
  if (ids.size === 0) return []
  const prevById = new Map(prev.map(n => [n.id, stripNodeUi(n)]))
  const nextById = new Map(next.map(n => [n.id, stripNodeUi(n)]))
  const patches: NodePatch[] = []

  for (const id of ids) {
    const before = prevById.get(id) ?? null
    const after = nextById.get(id) ?? null
    if (!before && after) {
      patches.push({ id, before: null, after })
      continue
    }
    if (before && !after) {
      patches.push({ id, before, after: null })
      continue
    }
    if (before && after && normalize(before) !== normalize(after)) {
      patches.push({ id, before, after })
    }
  }

  return patches
}

export const diffEdges = (prev: LinkEdge[], next: LinkEdge[]): EdgePatch[] => {
  const prevById = new Map(prev.map(e => [e.id, stripEdgeUi(e)]))
  const nextById = new Map(next.map(e => [e.id, stripEdgeUi(e)]))
  const ids = new Set<string>([...prevById.keys(), ...nextById.keys()])
  const patches: EdgePatch[] = []

  for (const id of ids) {
    const before = prevById.get(id) ?? null
    const after = nextById.get(id) ?? null
    if (!before && after) {
      patches.push({ id, before: null, after })
      continue
    }
    if (before && !after) {
      patches.push({ id, before, after: null })
      continue
    }
    if (before && after && normalize(before) !== normalize(after)) {
      patches.push({ id, before, after })
    }
  }

  return patches
}

export const diffEdgesById = (
  prev: LinkEdge[],
  next: LinkEdge[],
  ids: Set<string>,
): EdgePatch[] => {
  if (ids.size === 0) return []
  const prevById = new Map(prev.map(e => [e.id, stripEdgeUi(e)]))
  const nextById = new Map(next.map(e => [e.id, stripEdgeUi(e)]))
  const patches: EdgePatch[] = []

  for (const id of ids) {
    const before = prevById.get(id) ?? null
    const after = nextById.get(id) ?? null
    if (!before && after) {
      patches.push({ id, before: null, after })
      continue
    }
    if (before && !after) {
      patches.push({ id, before, after: null })
      continue
    }
    if (before && after && normalize(before) !== normalize(after)) {
      patches.push({ id, before, after })
    }
  }

  return patches
}

export const applyNodePatches = (nodes: NoteNode[], patches: NodePatch[], direction: 'undo' | 'redo'): NoteNode[] => {
  const byId = new Map(nodes.map(n => [n.id, n]))
  for (const patch of patches) {
    const next = direction === 'undo' ? patch.before : patch.after
    if (!next) {
      byId.delete(patch.id)
    } else {
      byId.set(patch.id, next)
    }
  }
  return Array.from(byId.values())
}

export const applyEdgePatches = (edges: LinkEdge[], patches: EdgePatch[], direction: 'undo' | 'redo'): LinkEdge[] => {
  const byId = new Map(edges.map(e => [e.id, e]))
  for (const patch of patches) {
    const next = direction === 'undo' ? patch.before : patch.after
    if (!next) {
      byId.delete(patch.id)
    } else {
      byId.set(patch.id, next)
    }
  }
  return Array.from(byId.values())
}

export const hasPatchContent = (patch: Patch): boolean =>
  Boolean(patch.nodes?.length) || Boolean(patch.edges?.length)
