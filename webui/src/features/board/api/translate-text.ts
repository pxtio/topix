import camelcaseKeys from "camelcase-keys"
import { useMutation } from "@tanstack/react-query"
import { apiFetch } from "@/api"
import type { Note } from "../types/note"
import type { Link } from "../types/link"

/**
 * Translate text into a target language.
 */
export async function translateText(
  text: string,
  targetLanguage: string
): Promise<{ notes: Note[], links: Link[] }> {
  const res = await apiFetch<{ data: Record<string, unknown> }>({
    path: "/tools/text:translate",
    method: "POST",
    body: { text, target_language: targetLanguage }
  })

  return camelcaseKeys(res.data, { deep: true }) as { notes: Note[], links: Link[] }
}

/**
 * Hook to translate text into notes/links.
 */
export const useTranslateText = () => {
  const mutation = useMutation({
    mutationFn: async ({
      text,
      targetLanguage
    }: {
      text: string,
      targetLanguage: string
    }): Promise<{ notes: Note[], links: Link[] }> => translateText(text, targetLanguage)
  })

  return {
    translateText: mutation.mutate,
    translateTextAsync: mutation.mutateAsync,
    ...mutation
  }
}
