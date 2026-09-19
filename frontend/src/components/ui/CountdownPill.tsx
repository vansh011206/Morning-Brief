import React, { useEffect, useState } from 'react'
import { cn } from '../../utils/cn'

export interface CountdownPillProps {
  targetTime?: string // format "HH:mm", default "07:00"
  className?: string
}

export const CountdownPill: React.FC<CountdownPillProps> = ({
  targetTime = '07:00',
  className,
}) => {
  const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number }>({
    hours: 0,
    minutes: 0,
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

      setTimeLeft({ hours, minutes })
    }

    calculateTimeRemaining()
    const timer = setInterval(calculateTimeRemaining, 10000)
    return () => clearInterval(timer)
  }, [targetTime])

  return (
    <div
      className={cn(
        'rounded-full bg-white border border-zinc-200 shadow-sm px-3 py-1 text-[12.5px] font-medium text-zinc-700 tabular-nums inline-flex items-center gap-1.5 select-none',
        className
      )}
      title={`Next brief compiles in ${timeLeft.hours}h ${timeLeft.minutes}m`}
    >
      <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
      </div>
      <span>
        in {timeLeft.hours}h {timeLeft.minutes}m
      </span>
    </div>
  )
}
