import { useMutation, useQuery } from "@tanstack/react-query"
import { sdk } from "../../lib/client" // Asegúrate de que esta ruta sea correcta
import { queryClient } from "../../lib/query-client"

// Definición de tipos básicos para evitar errores de 'any'
type SupportThread = {
  id: string
  status: "open" | "closed"
  seller_id: string
  created_at: string
}

type SupportMessage = {
  id: string
  body: string
  author_type: "seller" | "admin"
  created_at: string
}

export const useVendorThreads = () => {
  return useQuery({
    queryKey: ["vendor_threads"],
    // Usamos client.fetch porque son rutas personalizadas (/vendorapp/...)
    queryFn: async () => sdk.client.fetch<{ threads: SupportThread[] }>(`/vendorapp/support`),
  })
}

export const useVendorMessages = (threadId?: string) => {
  return useQuery({
    queryKey: ["vendor_messages", threadId],
    queryFn: async () => sdk.client.fetch<{ messages: SupportMessage[] }>(`/vendorapp/support/${threadId}/messages`),
    enabled: !!threadId,
  })
}

export const useVendorCreateThread = () => {
  return useMutation({
    mutationFn: async (payload: { body: string }) =>
      sdk.client.fetch<{ thread: SupportThread }>(`/vendorapp/support`, {
        method: "POST",
        body: payload,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor_threads"] })
    },
  })
}

export const useVendorSendMessage = (threadId?: string) => {
  return useMutation({
    mutationFn: async (payload: { body: string }) =>
      sdk.client.fetch(`/vendorapp/support/${threadId}/messages`, {
        method: "POST",
        body: payload,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor_messages", threadId] })
    },
  })
}