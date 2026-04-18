import { apiClient } from './client'
import type {
  Campaign,
  CampaignStats,
  CreateCampaignPayload,
  PaginatedResponse,
  ScheduleCampaignPayload,
  UpdateCampaignPayload,
} from '@/types'

export async function listCampaigns(page: number): Promise<PaginatedResponse<Campaign>> {
  const { data } = await apiClient.get<PaginatedResponse<Campaign>>('/campaigns', { params: { page } })
  return data
}

export async function getCampaign(id: string): Promise<Campaign> {
  const { data } = await apiClient.get<Campaign>(`/campaigns/${id}`)
  return data
}

export async function createCampaign(payload: CreateCampaignPayload): Promise<Campaign> {
  const { data } = await apiClient.post<Campaign>('/campaigns', payload)
  return data
}

export async function updateCampaign(id: string, payload: UpdateCampaignPayload): Promise<Campaign> {
  const { data } = await apiClient.patch<Campaign>(`/campaigns/${id}`, payload)
  return data
}

export async function deleteCampaign(id: string): Promise<void> {
  await apiClient.delete(`/campaigns/${id}`)
}

export async function scheduleCampaign(id: string, payload: ScheduleCampaignPayload): Promise<Campaign> {
  const { data } = await apiClient.post<Campaign>(`/campaigns/${id}/schedule`, payload)
  return data
}

export async function sendCampaign(id: string): Promise<{ message: string }> {
  const { data } = await apiClient.post<{ message: string }>(`/campaigns/${id}/send`)
  return data
}

export async function getCampaignStats(id: string): Promise<CampaignStats> {
  const { data } = await apiClient.get<CampaignStats>(`/campaigns/${id}/stats`)
  return data
}
