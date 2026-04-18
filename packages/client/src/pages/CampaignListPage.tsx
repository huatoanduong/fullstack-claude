import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useInfiniteQuery } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/StatusBadge'
import { SkeletonCard } from '@/components/SkeletonCard'
import { listCampaigns } from '@/api/campaigns'
import type { Campaign } from '@/types'

function recipientCount(campaign: Campaign): number {
  return campaign.recipient_count ?? campaign.recipients?.length ?? 0
}

export default function CampaignListPage() {
  const sentinelRef = useRef<HTMLDivElement>(null)

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
  } = useInfiniteQuery({
    queryKey: ['campaigns'],
    queryFn: ({ pageParam }) => listCampaigns(pageParam as number),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const { page, totalPages } = lastPage.pagination
      return page < totalPages ? page + 1 : undefined
    },
  })

  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          void fetchNextPage()
        }
      },
      { threshold: 0.1 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  const campaigns: Campaign[] = data?.pages.flatMap((page) => page.data) ?? []

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Campaigns</h1>
        <Button asChild size="sm">
          <Link to="/campaigns/new">
            <Plus className="mr-2 h-4 w-4" />
            New Campaign
          </Link>
        </Button>
      </div>

      {isError && (
        <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Failed to load campaigns: {(error as { message?: string })?.message ?? 'Unknown error'}
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : campaigns.length === 0 ? (
        <div className="rounded-lg border border-dashed py-16 text-center">
          <p className="text-muted-foreground">No campaigns yet.</p>
          <Button asChild variant="link" className="mt-2">
            <Link to="/campaigns/new">Create your first campaign</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map((campaign) => {
            const n = recipientCount(campaign)
            return (
              <Link
                key={campaign.id}
                to={`/campaigns/${campaign.id}`}
                className="block rounded-lg border bg-card p-4 transition-colors hover:bg-accent/40"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1 min-w-0">
                    <p className="font-medium truncate">{campaign.name}</p>
                    <p className="text-sm text-muted-foreground truncate">{campaign.subject}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(campaign.created_at).toLocaleDateString()} · {n} recipient
                      {n !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <StatusBadge status={campaign.status} className="shrink-0" />
                </div>
              </Link>
            )
          })}

          <div ref={sentinelRef} className="h-4" />

          {isFetchingNextPage && (
            <div className="space-y-3">
              {Array.from({ length: 2 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          )}

          {!hasNextPage && campaigns.length > 0 && (
            <p className="text-center text-xs text-muted-foreground py-2">All campaigns loaded</p>
          )}
        </div>
      )}
    </div>
  )
}
