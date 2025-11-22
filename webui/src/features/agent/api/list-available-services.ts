import { apiFetch } from "@/api"
import { useQuery } from "@tanstack/react-query"
import { defaultServices, type Services } from "../types/services"
import { useChatStore } from "../store/chat-store"
import { useEffect } from "react"


/**
 * Response structure for listing available services.
 */
export interface ListAvailableServicesResponse {
  llm: string[]
  search: string[]
  navigate: string[]
  code: string[]
}


/**
 * Update the default services with the available services from the server.
 *
 * @param availableServices - The available services from the server.
 * @returns Updated services with availability status.
 */
const updateDefaultServices = ({
  availableServices,
}: {
  availableServices: ListAvailableServicesResponse
}): Services => {
  // This function can be used to update the DefaultServices constant
  const services: Services = defaultServices()
  services.llm = services.llm.map((service) => ({
    ...service,
    available: availableServices.llm.includes(service.name),
  }))
  services.search = services.search.map((service) => ({
    ...service,
    available: availableServices.search.includes(service.name),
  }))
  services.navigate = services.navigate.map((service) => ({
    ...service,
    available: availableServices.navigate.includes(service.name),
  }))
  services.code = services.code.map((service) => ({
    ...service,
    available: availableServices.code.includes(service.name),
  }))

  return services
}


/**
 * Fetch the list of available services from the server.
 *
 * @returns A promise that resolves to the available services.
 */
export async function listAvailableServices(): Promise<Services> {
  const res = await apiFetch<{ data: ListAvailableServicesResponse }>({
    path: `/utils/services`,
    method: "GET",
  })

  return updateDefaultServices({ availableServices: res.data })
}


/**
 * React Query hook to list available services.
 *
 * @returns Query result containing the available services.
 */
export const useListAvailableServices = () => {
  const syncDefaults = useChatStore((state) => state.syncDefaults)

  const { data: availableServices } = useQuery({
    queryKey: ["listAvailableServices"],
    queryFn: () => listAvailableServices(),
    staleTime: Infinity,
  })

  useEffect(() => {
    if (availableServices) {
      syncDefaults(availableServices)
    }
  }, [availableServices, syncDefaults])

  return { availableServices }
}