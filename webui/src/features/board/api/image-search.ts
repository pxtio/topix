import { useQuery } from "@tanstack/react-query"
import { apiFetch } from "@/api"
import type { WebPhoto } from "./types"
import camelcaseKeys from "camelcase-keys"


export const IMAGE_SEARCH_ENGINES = ["unsplash", "serper", "linkup"] as const

export type ImageSearchEngine = (typeof IMAGE_SEARCH_ENGINES)[number]


/**
 * Search for images using the Unsplash API.
 * @param query The search query.
 * @returns A promise that resolves to an array of WebPhoto objects.
 */
export async function searchImages(query: string, engine: ImageSearchEngine = "unsplash"): Promise<WebPhoto[]> {
  const resp = await apiFetch<{ data: Record<string, unknown> }>({
    path: `/utils/images/search`,
    method: "GET",
    params: { query, engine },
  })
  const data = camelcaseKeys(resp.data, { deep: true })
  return data.images as WebPhoto[]
}


/**
 * Custom hook to search for images.
 */
export const useSearchImages = ({
  query,
  engine = "unsplash"
}: { query: string, engine?: ImageSearchEngine }) => {
  return useQuery<WebPhoto[]>({
    queryKey: ["imageSearch", query],
    queryFn: () => searchImages(query, engine),
    enabled: query.length > 0,
    staleTime: 1000 * 60 * 60 * 24 // 24 hours
  })
}