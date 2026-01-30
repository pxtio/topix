import type { AgentStreamMessage, StreamingContentType, StreamingMessageType, ToolName } from "../../types/stream"
import type { Annotation, FileAnnotation, RefAnnotation, UrlAnnotation } from "../../types/tool-outputs"

type RawChunk = Record<string, unknown>
type RawAnnotation = Record<string, unknown>

const mapAnnotation = (a: RawAnnotation): Annotation | null => {
  const type = a.type as string | undefined
  if (type === "url") {
    const url = a.url as string | undefined
    if (!url) return null
    return {
      type: "url",
      url,
      title: a.title as string | undefined,
      content: a.content as string | undefined,
      favicon: a.favicon as string | undefined,
      coverImage: (a.cover_image ?? a.coverImage) as string | undefined,
      sourceDomain: (a.source_domain ?? a.sourceDomain) as string | undefined,
      publishedAt: (a.published_at ?? a.publishedAt) as string | undefined,
      tags: Array.isArray(a.tags) ? (a.tags as string[]) : undefined
    } satisfies UrlAnnotation
  }
  if (type === "file") {
    const fileId = (a.file_id ?? a.fileId) as string | undefined
    const filePath = (a.file_path ?? a.filePath) as string | undefined
    const fileType = (a.file_type ?? a.fileType) as string | undefined
    if (!fileId || !filePath || !fileType) return null
    return { type: "file", fileId, filePath, fileType } satisfies FileAnnotation
  }
  if (type === "reference") {
    const refId = (a.ref_id ?? a.refId) as string | undefined
    if (!refId) return null
    return { type: "reference", refId } satisfies RefAnnotation
  }
  return null
}

export const simpleTransform = (raw: RawChunk): AgentStreamMessage => {
  const type = (raw.type ?? raw.type_) as StreamingMessageType
  const toolId = (raw.tool_id ?? raw.toolId ?? "") as string
  const toolName = (raw.tool_name ?? raw.toolName ?? "") as ToolName
  const isStop = Boolean(raw.is_stop ?? raw.isStop)

  const rawContent = raw.content as RawChunk | undefined
  const content = rawContent
    ? {
        type: rawContent.type as StreamingContentType,
        text: (rawContent.text ?? "") as string,
        annotations: Array.isArray(rawContent.annotations)
          ? rawContent.annotations
              .map((a) => mapAnnotation(a as RawAnnotation))
              .filter((a): a is Annotation => a !== null)
          : []
      }
    : undefined

  return { type, toolId, toolName, content, isStop }
}
