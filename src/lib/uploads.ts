/* eslint-disable no-console */
// /vendorapp-panel/src/lib/uploads.ts
import { backendUrl, publishableApiKey } from "./client"

type PresignResp = {
  mode: "s3" | "local"
  uploadUrl: string
  key?: string
  publicUrl?: string
  method: "PUT"
  headers?: Record<string, string>
  expiresInSeconds?: number
}

export type UploadResult = {
  mode: "s3" | "local"
  key?: string
  publicUrl?: string
}

// Minimal local helper so we don't rely on client.ts exporting it
async function postJsonUnauthed(path: string, body: Record<string, any>) {
  console.log("[uploads][presign POST]", { url: `${backendUrl}${path}`, body })
  const res = await fetch(`${backendUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-publishable-api-key": publishableApiKey,
    },
    body: JSON.stringify(body),
  })
  const text = await res.text().catch(() => "")
  console.log("[uploads][presign response]", res.status, res.statusText, text)
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${text || res.statusText}`)
  return text ? JSON.parse(text) : {}
}

export async function uploadImage(file: File): Promise<UploadResult> {
  console.log("[uploads] start uploadImage", { name: file.name, type: file.type, size: file.size })
  const presign = (await postJsonUnauthed("/public/uploads-presign", {
    fileName: file.name,
    contentType: file.type || "application/octet-stream",
    size: file.size,
  })) as PresignResp

  console.log("[uploads] presign resp", presign)

  const put = await fetch(presign.uploadUrl, {
    method: presign.method,
    headers: presign.headers,
    body: file,
  })
  const putText = await put.text().catch(() => "")
  console.log("[uploads] PUT result", put.status, put.statusText, putText)

  if (!put.ok) {
    throw new Error(`Upload failed: ${put.status} ${putText}`)
  }

  let key = presign.key
  if (!key && presign.mode === "s3") {
    try {
      const u = new URL(presign.uploadUrl)
      key = u.pathname.replace(/^\/+/, "")
    } catch {}
  }

  const result = { mode: presign.mode, key, publicUrl: presign.publicUrl }
  console.log("[uploads] final result", result)
  return result
}

export async function uploadImageAndGetUrl(file: File): Promise<string> {
  const res = await uploadImage(file)
  if (!res.publicUrl) {
    throw new Error("No publicUrl returned by presign")
  }
  return res.publicUrl
}
