import camelcaseKeys from "camelcase-keys"
import type { LinkPreview } from "../types/web"
import { useQuery } from "@tanstack/react-query"
import { apiFetch } from "@/api"

interface LinkPreviewResponse {
  data: {
    title?: string
    description?: string
    image?: string
    site_name?: string
    favicon?: string
  }
}


/**
 * Fetches a preview of a webpage.
 *
 * @param url - The URL of the webpage to preview.
 * @returns A promise that resolves to a LinkPreview object containing the title, description, image, site name, and favicon of the webpage.
 * @throws An error if the fetch request fails.
 */
export async function previewWebpage(userId: string, url: string): Promise<LinkPreview> {
  const res = await apiFetch<LinkPreviewResponse>({
    path: `/tools/webpages/preview`,
    method: "POST",
    params: { user_id: userId },
    body: { url },
  })
  return camelcaseKeys(res.data, { deep: true }) as LinkPreview
}


/**
 * Custom hook to fetch a link preview for a webpage.
 */
export const usePreviewWebpage = ({
  userId,
  url
}: {
  userId: string,
  url: string
}) => {
  return useQuery<LinkPreview>({
    queryKey: ["previewWebpage", userId, url],
    queryFn: () => previewWebpage(userId, url),
    enabled: !!userId && !!url,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchInterval: Infinity
  })
}