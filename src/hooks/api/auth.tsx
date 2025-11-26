/* eslint-disable no-console */
import { FetchError } from "@medusajs/js-sdk"
import { HttpTypes } from "@medusajs/types"
import { UseMutationOptions, useMutation } from "@tanstack/react-query"
import { fetchQuery, sdk } from "../../lib/client"

/** -------- Originals (kept for backwards compatibility) -------- */

export const useSignInWithEmailPass = (
  options?: UseMutationOptions<
    | string
    | { location: string },
    FetchError,
    HttpTypes.AdminSignUpWithEmailPassword
  >
) =>
  useMutation({
    mutationFn: (payload) => sdk.auth.login("seller", "emailpass", payload),
    onSuccess: (data, variables, ctx) => options?.onSuccess?.(data, variables, ctx),
    ...options,
  })

export const useSignUpWithEmailPass = (
  options?: UseMutationOptions<
    string,
    FetchError,
    HttpTypes.AdminSignInWithEmailPassword & {
    confirmPassword: string
    name: string
  }
  >
) =>
  useMutation({
    mutationFn: (payload) => sdk.auth.register("seller", "emailpass", payload),
    onSuccess: async (_, variables) => {
      // Legacy behavior: create seller using core route
      const seller = {
        name: variables.name,
        member: {
          name: variables.name,
          email: variables.email,
        },
      }
      await fetchQuery("/vendor/sellers", {
        method: "POST",
        body: seller,
      })
    },
    ...options,
  })

export const useSignUpForInvite = (
  options?: UseMutationOptions<string, FetchError, HttpTypes.AdminSignInWithEmailPassword>
) =>
  useMutation({
    mutationFn: (payload) => sdk.auth.register("seller", "emailpass", payload),
    onError: (e) => console.log("[invite-signup] error", e),
    ...options,
  })

export const useResetPasswordForEmailPass = (
  options?: UseMutationOptions<void, FetchError, { email: string }>
) =>
  useMutation({
    mutationFn: (payload) =>
      sdk.auth.resetPassword("seller", "emailpass", { identifier: payload.email }),
    onSuccess: (data, variables, ctx) => options?.onSuccess?.(data, variables, ctx),
    onError: (e) => console.log("[reset-pass] error", e),
    ...options,
  })

export const useLogout = (options?: UseMutationOptions<void, FetchError>) =>
  useMutation({
    mutationFn: () => {
      console.log("[auth][logout]")
      return sdk.auth.logout()
    },
    onError: (e) => console.log("[auth][logout] error", e),
    ...options,
  })

export const useUpdateProviderForEmailPass = (
  token: string,
  options?: UseMutationOptions<void, FetchError, { password: string }>
) =>
  useMutation({
    mutationFn: (payload) => sdk.auth.updateProvider("seller", "emailpass", payload, token),
    onSuccess: (data, variables, ctx) => options?.onSuccess?.(data, variables, ctx),
    onError: (e) => console.log("[auth][update-provider] error", e),
    ...options,
  })

/** --------------------------------------------------------------------------
 * NEW: Hooks for the extended vendor signup flow
 * ------------------------------------------------------------------------- */

export const useSignUpWithEmailPassBare = (
  options?: UseMutationOptions<
    void,
    FetchError,
    HttpTypes.AdminSignInWithEmailPassword & { confirmPassword: string }
  >
) =>
  useMutation({
    mutationFn: async (payload) => {
      const { email, password, confirmPassword } = payload

      // 1) Create the auth identity (no session yet)
      await sdk.auth.register("seller", "emailpass", {
        email,
        password,
        confirmPassword,
        metadata: { __signup_extra: { created_at: new Date().toISOString() } },
      } as any)

      // 2) Immediately sign in to establish a session cookie for localhost:9000
      //    (this is what authenticate("user", ...) expects)
      await sdk.auth.login("seller", "emailpass", { email, password })
      // now fetchQuery(...) to /vendorapp/sellers-extended will send the cookie
    },
    onSuccess: (data, vars, ctx) => options?.onSuccess?.(data, vars, ctx),
    onError: (e) => console.log("[signup-bare] error", e),
    ...options,
  })

export type CreateSellerExtendedBody = {
  name: string
  member: { name: string; email: string }
  seller?: {
    email?: string | null
    phone?: string | null
    address_line?: string | null
    city?: string | null
    state?: string | null
    postal_code?: string | null
    country_code?: string | null
    tax_id?: string | null
  }
  seller_data?: Record<string, unknown>
}

/** Calls your new backend route /vendorapp/sellers-extended */
export const useCreateSellerExtended = (
  options?: UseMutationOptions<void, FetchError, CreateSellerExtendedBody>
) =>
  useMutation({
    mutationFn: async (body) => {
      console.log("[create-seller-extended] POST /vendorapp/sellers-extended", body)
      await fetchQuery("/vendorapp/sellers-extended", {
        method: "POST",
        body,
      })
    },
    onSuccess: (data, vars, ctx) => options?.onSuccess?.(data, vars, ctx),
    onError: (e) => console.log("[create-seller-extended] error", e),
    ...options,
  })

/** -------- Types used by Register screen (for convenience) -------- */
export type RegisterPayload = HttpTypes.AdminSignInWithEmailPassword & {
  confirmPassword: string
  name: string
  member_name: string
  phone?: string
  address_line?: string
  city?: string
  state?: string
  postal_code?: string
  country_code?: string
  tax_id?: string
  industry?: string
  bank_number?: string
  bank_name?: string
  bank_account_type?: string
  business_legal_name?: string
  ci_number?: string
  gender?: "male" | "female"
  business_type: "individual" | "business"
  ci_picture_url?: string
  tax_id_picture_url?: string
  ci_picture_key?: string
  tax_id_picture_key?: string
}
