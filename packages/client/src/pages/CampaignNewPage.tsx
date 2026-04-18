import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { EmailTagInput } from '@/components/EmailTagInput'
import { createCampaign } from '@/api/campaigns'
import { getOrCreateRecipient } from '@/api/recipients'
import type { RecipientTag, ApiError } from '@/types'

export default function CampaignNewPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [name, setName] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [tags, setTags] = useState<RecipientTag[]>([])
  const [error, setError] = useState<string | null>(null)
  const [resolving, setResolving] = useState(false)

  const mutation = useMutation({
    mutationFn: createCampaign,
    onSuccess: (campaign) => {
      void queryClient.invalidateQueries({ queryKey: ['campaigns'] })
      navigate(`/campaigns/${campaign.id}`)
    },
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    let recipientIds: string[] = []

    if (tags.length > 0) {
      setResolving(true)
      try {
        const results = await Promise.all(tags.map(getOrCreateRecipient))
        recipientIds = results.map((r) => r.id)
      } catch (err: unknown) {
        const apiErr = (err as { response?: { data?: ApiError } })?.response?.data
        setError(apiErr?.error ?? 'Failed to resolve recipients. Please try again.')
        setResolving(false)
        return
      } finally {
        setResolving(false)
      }
    }

    mutation.mutate(
      { name, subject, body, recipientIds },
      {
        onError: (err: unknown) => {
          const apiErr = (err as { response?: { data?: ApiError } })?.response?.data
          setError(apiErr?.error ?? 'Failed to create campaign.')
        },
      },
    )
  }

  const isSubmitting = resolving || mutation.isPending

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/campaigns">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">New Campaign</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="name">Campaign name</Label>
          <Input
            id="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isSubmitting}
            placeholder="Summer Sale Announcement"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="subject">Email subject</Label>
          <Input
            id="subject"
            required
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            disabled={isSubmitting}
            placeholder="Don't miss our biggest sale of the year"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="body">Email body</Label>
          <Textarea
            id="body"
            required
            value={body}
            onChange={(e) => setBody(e.target.value)}
            disabled={isSubmitting}
            placeholder="Write your email content here…"
            className="min-h-[160px]"
          />
        </div>

        <div className="space-y-1.5">
          <Label>
            Recipients{' '}
            <span className="text-muted-foreground font-normal">(optional — add emails, press Enter)</span>
          </Label>
          <EmailTagInput value={tags} onChange={setTags} disabled={isSubmitting} />
          {tags.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {tags.length} recipient{tags.length !== 1 ? 's' : ''} added
            </p>
          )}
        </div>

        {error && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
        )}

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate('/campaigns')} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creating…' : 'Create Campaign'}
          </Button>
        </div>
      </form>
    </div>
  )
}
