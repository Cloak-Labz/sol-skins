import type React from "react"
import { cn } from "@/lib/utils"

interface NeonCardProps {
  topContent?: React.ReactNode
  bottomContent?: React.ReactNode
  className?: string
}

export function NeonCard({ topContent, bottomContent, className }: NeonCardProps) {
  return (
    <div
      className={cn(
        "relative rounded-[2rem] p-[3px]",
        "bg-gradient-to-br from-orange-400 via-amber-500 to-orange-400",
        "shadow-[0_0_30px_rgba(251,146,60,0.4),0_0_15px_rgba(251,146,60,0.3),0_0_8px_rgba(251,146,60,0.2)]",
        "before:absolute before:inset-0 before:rounded-[2rem] before:bg-gradient-to-br before:from-orange-500/30 before:via-amber-600/30 before:to-orange-500/30 before:blur-md before:-z-10",
        className,
      )}
    >
      {/* Second border layer */}
      <div className="relative rounded-[1.9rem] bg-gradient-to-br from-orange-500/60 via-amber-600/60 to-orange-500/60 p-[3px] shadow-[inset_0_0_10px_rgba(251,146,60,0.3),0_0_20px_rgba(251,146,60,0.4)]">
        {/* Third border layer */}
        <div className="relative rounded-[1.8rem] bg-gradient-to-br from-orange-400 via-amber-500 to-orange-400 p-[2px] shadow-[0_0_15px_rgba(251,146,60,0.3),inset_0_0_8px_rgba(251,146,60,0.2)]">
          {/* Main content container */}
          <div className="relative rounded-[1.75rem] overflow-hidden bg-[radial-gradient(ellipse_at_bottom_right,#78350f,#1c1917_50%,#292524)] shadow-[inset_0_4px_30px_rgba(0,0,0,0.8)]">
            {/* Texture overlay */}
            <div
              className="absolute inset-0 opacity-40"
              style={{
                backgroundImage: `
                  repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.1) 2px, rgba(0,0,0,0.1) 4px),
                  repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(0,0,0,0.1) 2px, rgba(0,0,0,0.1) 4px)
                `,
              }}
            />

            {/* Ambient lighting */}
            <div className="absolute inset-0 bg-gradient-to-br from-orange-950/20 via-transparent to-orange-950/20" />

            <div className="relative z-10 m-4">
              <div className="relative rounded-[1.5rem] p-[2px] bg-gradient-to-br from-orange-400 via-amber-500 to-orange-400 shadow-[0_0_15px_rgba(251,146,60,0.3),0_0_8px_rgba(251,146,60,0.2)]">
                <div className="relative rounded-[1.4rem] bg-gradient-to-br from-orange-500/50 via-amber-600/50 to-orange-500/50 p-[2px]">
                  <div className="relative rounded-[1.35rem] bg-[radial-gradient(ellipse_at_center,#78350f,#1c1917)] min-h-[80px] p-4 shadow-[inset_0_2px_20px_rgba(0,0,0,0.7)]">
                    {topContent}
                  </div>
                </div>
              </div>
            </div>

            <div className="relative z-10 m-4 mt-2">
              <div className="relative rounded-[1.5rem] p-[2px] bg-gradient-to-br from-orange-400 via-amber-500 to-orange-400 shadow-[0_0_15px_rgba(251,146,60,0.3),0_0_8px_rgba(251,146,60,0.2)]">
                <div className="relative rounded-[1.4rem] bg-gradient-to-br from-orange-500/50 via-amber-600/50 to-orange-500/50 p-[2px]">
                  <div className="relative rounded-[1.35rem] bg-[radial-gradient(ellipse_at_center,#78350f,#1c1917)] min-h-[350px] p-4 shadow-[inset_0_2px_20px_rgba(0,0,0,0.7)]">
                    {bottomContent}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
