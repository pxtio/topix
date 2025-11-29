import { apiFetch } from "@/api"
import { useQuery } from "@tanstack/react-query"


/**
 * Fetch an image from the server by filename.
 */
export const getImage = async (filename: string): Promise<string | undefined> => {
  const response = await apiFetch<{ data: { base64_url: string } }>({
    path: '/files',
    method: 'GET',
    params: { filename },
  })
  return response.data.base64_url
}


/**
 * Custom hook to fetch an image by filename.
 */
export const useGetImage = (filename: string) => {
  return useQuery({
    queryKey: ['getImage', filename],
    queryFn: () => getImage(filename),
    enabled: !!filename,
  })
}