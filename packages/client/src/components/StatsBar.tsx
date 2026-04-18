import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

interface StatsBarProps {
  label: string
  ratio: number
  className?: string
}

export function StatsBar({ label, ratio, className }: StatsBarProps) {
  const pct = Math.round(ratio * 100)
  return (
    <div className={cn('space-y-1', className)}>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{pct}%</span>
      </div>
      <Progress value={pct} className="h-2" />
    </div>
  )
}
