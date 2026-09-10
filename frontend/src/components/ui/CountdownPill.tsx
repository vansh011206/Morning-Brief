import React, { useEffect, useState } from 'react'
import { Sunrise, Clock } from 'lucide-react'
import { cn } from '../../utils/cn'

export interface CountdownPillProps {
  targetTime?: string // format "HH:mm", default "07:00"
  className?: string
}

export const CountdownPill: React.FC<CountdownPillProps> = ({
  targetTime = '07:00',
  className,
}) => {
  const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number }>({
    hours: 0,
    minutes: 0,
    seconds: 0,
  })

  useEffect(() => {
    const calculateTimeRemaining = () => {
      const now = new Date()
      const [targetHours, targetMinutes] = targetTime.split(':').map(Number)

      const target = new Date(now)
      target.setHours(targetHours || 7, targetMinutes || 0, 0, 0)

      // If target time has already passed today, target tomorrow's time
      if (now.getTime() >= target.getTime()) {
        target.setDate(target.getDate() + 1)
      }

      const diffMs = target.getTime() - now.getTime()
      const totalSeconds = Math.max(0, Math.floor(diffMs / 1000))
      const hours = Math.floor(totalSeconds / 3600)
      const minutes = Math.floor((totalSeconds % 3600) / 60)
      const seconds = totalSeconds % 60

      setTimeLeft({ hours, minutes, seconds })
    }

    calculateTimeRemaining()
    const timer = setInterval(calculateTimeRemaining, 1000)
    return () => clearInterval(timer)
  }, [targetTime])

  // Format 07:00 to 12h display like "07:00 AM"
  const formattedTargetTime = (() => {
    const [hStr, mStr] = targetTime.split(':')
    const h = parseInt(hStr || '7', 10)
    const m = mStr || '00'
    const ampm = h >= 12 ? 'PM' : 'AM'
    const displayH = h % 12 || 12
    return `${displayH.toString().padStart(2, '0')}:${m} ${ampm}`
  })()

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-amber-200/80 bg-amber-sunrise-light/90 text-amber-800 shadow-sm text-xs font-medium select-none',
        className
      )}
      title={`Next morning briefing delivers at ${formattedTargetTime}`}
    >
      <div className="flex items-center gap-1 text-amber-600">
        <Sunrise className="w-3.5 h-3.5 animate-pulse" />
        <span className="font-semibold">{formattedTargetTime}</span>
      </div>
      <span className="text-amber-400">•</span>
      <div className="flex items-center gap-1 text-amber-700 tabular-nums">
        <Clock className="w-3 h-3 text-amber-500" />
        <span>in {timeLeft.hours}h {timeLeft.minutes}m {timeLeft.seconds}s</span>
      </div>
    </div>
  )
}
