import { useQueryClient } from '@tanstack/react-query'
import type { Campaign } from '@/types'

export function useSendingInterval(campaignId: string) {
  const queryClient = useQueryClient()

  return () => {
    const cam = queryClient.getQueryData<Campaign>(['campaign', campaignId])
    return cam?.status === 'sending' ? 3000 : false
  }
}
