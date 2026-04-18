export interface AuthUser {
  id: string
  email: string
  name: string
}

export interface AuthResponse {
  user: AuthUser
  accessToken: string
}

export interface LoginPayload {
  email: string
  password: string
}

export interface RegisterPayload {
  email: string
  name: string
  password: string
}

export type CampaignStatus = 'draft' | 'scheduled' | 'sending' | 'sent'

export interface Recipient {
  id: string
  email: string
  name: string | null
  created_at: string
  CampaignRecipient?: {
    status: 'pending' | 'sent' | 'failed'
    sent_at: string | null
    opened_at: string | null
  }
}

export interface Campaign {
  id: string
  name: string
  subject: string
  body: string
  status: CampaignStatus
  scheduled_at: string | null
  created_by: string
  created_at: string
  updated_at: string
  /** Present on paginated list (server subquery). */
  recipient_count?: number
  /** Present on GET /campaigns/:id (Sequelize alias `recipients`). */
  recipients?: Recipient[]
}

export interface CreateCampaignPayload {
  name: string
  subject: string
  body: string
  recipientIds?: string[]
}

export interface UpdateCampaignPayload {
  name?: string
  subject?: string
  body?: string
}

export interface ScheduleCampaignPayload {
  scheduled_at: string
}

export interface CampaignStats {
  total: number
  sent: number
  failed: number
  opened: number
  open_rate: number
  send_rate: number
}

export interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: Pagination
}

export interface CreateRecipientPayload {
  email: string
  name: string
}

export interface RecipientTag {
  email: string
  name: string
}

export interface ApiError {
  error: string
  details?: unknown
}
