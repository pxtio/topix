import camelcaseKeys from "camelcase-keys"

import { apiFetch } from "@/api"


export type CodeExecutionResult = {
  status: "success" | "error" | "timeout"
  stdout: string
  stderr: string
  durationMs: number
}


/**
 * Execute a code sandbox note on the backend and return stdout/stderr.
 */
export async function executeCodeNote(
  boardId: string,
  noteId: string,
): Promise<CodeExecutionResult> {
  const res = await apiFetch<{ data: Record<string, unknown> }>({
    path: `/boards/${boardId}/notes/${noteId}:execute`,
    method: "POST",
  })

  return camelcaseKeys(res.data, { deep: true }) as CodeExecutionResult
}
