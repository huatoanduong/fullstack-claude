import type { Request } from 'express'

export interface AuthPayload {
  userId: string
}

export type AuthedRequest = Request & { user: AuthPayload }

export interface PaginationQuery {
  page?: string
  limit?: string
}
