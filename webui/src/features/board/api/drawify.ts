import type { Link } from "../types/link"
import type { Note } from "../types/note"
import camelcaseKeys from "camelcase-keys"
import { useMutation } from "@tanstack/react-query"
import { apiFetch } from "@/api"


export async function drawify(answer: string): Promise<{ notes: Note[]; links: Link[] }> {
  const res = await apiFetch<{ data: Record<string, unknown> }>({
    path: "/tools/drawify",
    method: "POST",
    body: { answer }
  })

  return camelcaseKeys(res.data, { deep: true }) as { notes: Note[]; links: Link[] }
}


export const useDrawify = () => {
  const mutation = useMutation({
    mutationFn: async ({
      answer,
    }: {
      answer: string
    }): Promise<{ notes: Note[]; links: Link[] }> => {
      return drawify(answer)
    }
  })

  return {
    drawify: mutation.mutate,
    drawifyAsync: mutation.mutateAsync,
    ...mutation,
  }
}
