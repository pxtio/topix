import { useQuery } from "@tanstack/react-query"
import { apiFetch } from "@/api"
import camelcaseKeys from "camelcase-keys"
import type { IconifyIcon } from "./types"


/**
 * Search for icons using the Iconify API.
 * @param query The search query.
 * @returns A promise that resolves to an array of IconifyIcon objects.
 */
export const searchIcons = async (query: string): Promise<IconifyIcon[]> => {
  const resp = await apiFetch<{ data: Record<string, unknown> }>({
    path: `/utils/icons/search`,
    method: "GET",
    params: { query },
  })
  const data = camelcaseKeys(resp.data, { deep: true })
  return data.icons as IconifyIcon[]
}


/**
 * Custom hook to search for icons.
 */
export const useSearchIcons = ({
  query
}: { query: string }) => {
  return useQuery<IconifyIcon[]>({
    queryKey: ["iconSearch", query],
    queryFn: () => searchIcons(query),
    enabled: query.length > 0,
    staleTime: 1000 * 60 * 60 // 1 hour
  })
}