import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Calendar, Send, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '@/components/StatusBadge'
import { StatsBar } from '@/components/StatsBar'
import {
  getCampaign,
  deleteCampaign,
  scheduleCampaign,
  sendCampaign,
  getCampaignStats,
} from '@/api/campaigns'
import { useSendingInterval } from '@/hooks/useSendingInterval'
import type { ApiError } from '@/types'

export default function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>()
  const campaignId = id ?? ''
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [scheduledAt, setScheduledAt] = useState('')
  const [scheduleError, setScheduleError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const sendingInterval = useSendingInterval(campaignId)

  const { data: campaign, isLoading, isError } = useQuery({
    queryKey: ['campaign', campaignId],
    queryFn: () => getCampaign(campaignId),
    enabled: campaignId.length > 0,
    refetchInterval: sendingInterval,
  })

  const { data: stats } = useQuery({
    queryKey: ['campaign-stats', campaignId],
    queryFn: () => getCampaignStats(campaignId),
    enabled: campaignId.length > 0,
    refetchInterval: sendingInterval,
  })

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['campaign', campaignId] })
    void queryClient.invalidateQueries({ queryKey: ['campaign-stats', campaignId] })
    void queryClient.invalidateQueries({ queryKey: ['campaigns'] })
  }

  const deleteMutation = useMutation({
    mutationFn: () => deleteCampaign(campaignId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['campaigns'] })
      navigate('/campaigns', { replace: true })
    },
    onError: (err: unknown) => {
      const apiErr = (err as { response?: { data?: ApiError } })?.response?.data
      setActionError(apiErr?.error ?? 'Failed to delete campaign.')
    },
  })

  const scheduleMutation = useMutation({
    mutationFn: (scheduled_at: string) => scheduleCampaign(campaignId, { scheduled_at }),
    onSuccess: () => {
      setScheduleOpen(false)
      setScheduledAt('')
      setScheduleError(null)
      invalidate()
    },
    onError: (err: unknown) => {
      const apiErr = (err as { response?: { data?: ApiError } })?.response?.data
      setScheduleError(apiErr?.error ?? 'Failed to schedule campaign.')
    },
  })

  const sendMutation = useMutation({
    mutationFn: () => sendCampaign(campaignId),
    onSuccess: invalidate,
    onError: (err: unknown) => {
      const apiErr = (err as { response?: { data?: ApiError } })?.response?.data
      setActionError(apiErr?.error ?? 'Failed to initiate send.')
    },
  })

  const handleScheduleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setScheduleError(null)
    const selected = new Date(scheduledAt)
    if (Number.isNaN(selected.getTime()) || selected <= new Date()) {
      setScheduleError('Scheduled time must be in the future.')
      return
    }
    scheduleMutation.mutate(selected.toISOString())
  }

  const isDraft = campaign?.status === 'draft'
  const isScheduled = campaign?.status === 'scheduled'
  const isSending = campaign?.status === 'sending'

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  if (isError || !campaign) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <p className="text-destructive">Campaign not found or failed to load.</p>
        <Button variant="link" asChild>
          <Link to="/campaigns">Back to campaigns</Link>
        </Button>
      </div>
    )
  }

  const recipients = campaign.recipients ?? []

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/campaigns">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{campaign.name}</h1>
            <p className="text-sm text-muted-foreground">{campaign.subject}</p>
          </div>
        </div>
        <StatusBadge status={campaign.status} className="mt-1 shrink-0" />
      </div>

      <div className="flex flex-wrap gap-2">
        {isDraft && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setScheduleOpen(true)}
            disabled={scheduleMutation.isPending}
          >
            <Calendar className="mr-2 h-4 w-4" />
            Schedule
          </Button>
        )}
        {(isDraft || isScheduled) && (
          <Button size="sm" onClick={() => sendMutation.mutate()} disabled={sendMutation.isPending || isSending}>
            <Send className="mr-2 h-4 w-4" />
            {sendMutation.isPending ? 'Sending…' : 'Send Now'}
          </Button>
        )}
        {isDraft && (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => deleteMutation.mutate()}
            disabled={deleteMutation.isPending}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
          </Button>
        )}
      </div>

      {actionError && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{actionError}</p>
      )}

      {campaign.scheduled_at && (
        <div className="rounded-md border px-4 py-3 text-sm">
          <span className="text-muted-foreground">Scheduled for: </span>
          <span className="font-medium">{new Date(campaign.scheduled_at).toLocaleString()}</span>
        </div>
      )}

      <div className="rounded-md border bg-muted/30 px-4 py-4">
        <p className="text-sm font-medium mb-2 text-muted-foreground">Email Body</p>
        <p className="text-sm whitespace-pre-wrap">{campaign.body}</p>
      </div>

      {stats && (
        <div className="rounded-lg border p-4 space-y-4">
          <h2 className="font-semibold text-sm">Statistics</h2>
          <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
            <div>
              <span className="text-muted-foreground">Total: </span>
              <span className="font-medium">{stats.total}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Sent: </span>
              <span className="font-medium">{stats.sent}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Failed: </span>
              <span className="font-medium">{stats.failed}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Opened: </span>
              <span className="font-medium">{stats.opened}</span>
            </div>
          </div>
          <StatsBar label="Send Rate" ratio={stats.send_rate} />
          <StatsBar label="Open Rate" ratio={stats.open_rate} />
        </div>
      )}

      {recipients.length > 0 && (
        <div className="space-y-2">
          <h2 className="font-semibold text-sm">Recipients ({recipients.length})</h2>
          <div className="rounded-md border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">Email</th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">Name</th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">Sent At</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {recipients.map((r) => (
                  <tr key={r.id} className="hover:bg-muted/30">
                    <td className="px-4 py-2">{r.email}</td>
                    <td className="px-4 py-2">{r.name ?? '—'}</td>
                    <td className="px-4 py-2">
                      <span
                        className={
                          r.CampaignRecipient?.status === 'sent'
                            ? 'text-green-600'
                            : r.CampaignRecipient?.status === 'failed'
                              ? 'text-destructive'
                              : 'text-muted-foreground'
                        }
                      >
                        {r.CampaignRecipient?.status ?? 'pending'}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      {r.CampaignRecipient?.sent_at
                        ? new Date(r.CampaignRecipient.sent_at).toLocaleString()
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Schedule Campaign</DialogTitle>
            <DialogDescription>Choose a future date and time to send this campaign.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleScheduleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="scheduled_at">Date &amp; Time</Label>
              <Input
                id="scheduled_at"
                type="datetime-local"
                required
                value={scheduledAt}
                onChange={(e) => {
                  setScheduledAt(e.target.value)
                  setScheduleError(null)
                }}
                min={new Date(Date.now() + 60_000).toISOString().slice(0, 16)}
              />
            </div>
            {scheduleError && <p className="text-xs text-destructive">{scheduleError}</p>}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setScheduleOpen(false)
                  setScheduleError(null)
                }}
                disabled={scheduleMutation.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={scheduleMutation.isPending}>
                {scheduleMutation.isPending ? 'Scheduling…' : 'Schedule'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
