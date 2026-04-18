import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { CampaignStatus } from '@/types'

const STATUS_CONFIG: Record<CampaignStatus, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'border-transparent bg-slate-200 text-slate-700 hover:bg-slate-200' },
  scheduled: {
    label: 'Scheduled',
    className: 'border-transparent bg-blue-100 text-blue-700 hover:bg-blue-100',
  },
  sending: {
    label: 'Sending',
    className: 'border-transparent bg-amber-100 text-amber-700 hover:bg-amber-100',
  },
  sent: { label: 'Sent', className: 'border-transparent bg-green-100 text-green-700 hover:bg-green-100' },
}

interface StatusBadgeProps {
  status: CampaignStatus
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.draft
  return <Badge className={cn(config.className, className)}>{config.label}</Badge>
}
