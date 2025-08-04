import camelcaseKeys from "camelcase-keys"
import type { LinkPreview } from "../types/web"
import { API_URL } from "@/config/api"
import { useQuery } from "@tanstack/react-query"


/**
 * Fetches a preview of a webpage.
 *
 * @param url - The URL of the webpage to preview.
 * @returns A promise that resolves to a LinkPreview object containing the title, description, image, site name, and favicon of the webpage.
 * @throws An error if the fetch request fails.
 */
export async function previewWebpage(userId: string, url: string): Promise<LinkPreview> {
  const headers = new Headers()
  headers.set("Content-Type", "application/json")

  const response = await fetch(`${API_URL}/tools/webpage/preview?user_id=${userId}`, {
    method: "POST",
    headers: headers,
    body: JSON.stringify({ url }),
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch link preview: ${response.statusText}`)
  }

  const data = await response.json()
  return camelcaseKeys(data.data, { deep: true }) as LinkPreview
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