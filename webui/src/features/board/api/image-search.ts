import { useQuery } from "@tanstack/react-query"
import { apiFetch } from "@/api"
import type { UnsplashPhoto } from "./types"
import camelcaseKeys from "camelcase-keys"


/**
 * Search for images using the Unsplash API.
 * @param query The search query.
 * @returns A promise that resolves to an array of UnsplashPhoto objects.
 */
export async function searchImages(query: string): Promise<UnsplashPhoto[]> {
  const resp = await apiFetch<{ data: Record<string, unknown> }>({
    path: `/utils/images/search`,
    method: "GET",
    params: { query },
  })
  const data = camelcaseKeys(resp.data, { deep: true })
  return data.images as UnsplashPhoto[]
}


/**
 * Custom hook to search for images.
 */
export const useSearchImages = ({
  query
}: { query: string }) => {
  return useQuery<UnsplashPhoto[]>({
    queryKey: ["imageSearch", query],
    queryFn: () => searchImages(query),
    enabled: query.length > 0,
    staleTime: 1000 * 60 * 60 // 1 hour
  })
}