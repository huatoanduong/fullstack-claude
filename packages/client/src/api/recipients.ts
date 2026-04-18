import { apiClient } from './client'
import type { CreateRecipientPayload, Recipient } from '@/types'

export async function listRecipients(): Promise<Recipient[]> {
  const { data } = await apiClient.get<{ data: Recipient[] }>('/recipients')
  return data.data
}

export async function createRecipient(payload: CreateRecipientPayload): Promise<Recipient> {
  const { data } = await apiClient.post<Recipient>('/recipients', payload)
  return data
}

export async function getOrCreateRecipient(payload: CreateRecipientPayload): Promise<Recipient> {
  try {
    return await createRecipient(payload)
  } catch (err: unknown) {
    const status = (err as { response?: { status?: number } })?.response?.status
    if (status === 409) {
      const all = await listRecipients()
      const existing = all.find((r) => r.email.toLowerCase() === payload.email.toLowerCase())
      if (existing) return existing
    }
    throw err
  }
}
