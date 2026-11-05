'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getUserId } from '@/lib/supabase/get-user-id'
import { cn } from '@/lib/utils'
import { Minus, Plus, Droplets } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface WaterTrackerProps {
  date: string
  metaAgua?: number
}

const GLASS_ML = 250 // cada copo = 250ml

export function WaterTracker({ date, metaAgua = 2500 }: WaterTrackerProps) {
  const [waterMl, setWaterMl] = useState(0)
  const [loading, setLoading] = useState(true)

  const maxGlasses = Math.ceil(metaAgua / GLASS_ML)
  const glasses = Math.ceil(waterMl / GLASS_ML)
  const percentage = Math.min((waterMl / metaAgua) * 100, 100)

  useEffect(() => {
    let cancelled = false

    const fetchWater = async () => {
      try {
        const userId = await getUserId()
        if (!userId || cancelled) return

        const { data } = await createClient()
          .from('water_intake')
          .select('quantidade_ml')
          .eq('user_id', userId)
          .eq('data', date)
          .maybeSingle()

        if (data && !cancelled) {
          setWaterMl(data.quantidade_ml)
        }
      } catch (error) {
        console.error('Erro ao carregar consumo de água:', error)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchWater()
    return () => {
      cancelled = true
    }
  }, [date])

  const updateWater = async (newMl: number) => {
    const clampedMl = Math.max(0, Math.min(newMl, maxGlasses * GLASS_ML))
    setWaterMl(clampedMl)

    const userId = await getUserId()
    if (!userId) return

    await createClient()
      .from('water_intake')
      .upsert({
        user_id: userId,
        data: date,
        quantidade_ml: clampedMl,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,data'
      })
  }

  const addGlass = () => updateWater(waterMl + GLASS_ML)
  const removeGlass = () => updateWater(waterMl - GLASS_ML)
  const toggleGlass = (index: number) => {
    const targetMl = (index + 1) * GLASS_ML
    if (waterMl >= targetMl) {
      updateWater(index * GLASS_ML)
    } else {
      updateWater(targetMl)
    }
  }

  if (loading) {
    return (
      <div className="bg-card/50 rounded-2xl p-4 animate-pulse">
        <div className="h-20 bg-muted rounded" />
      </div>
    )
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Droplets className="w-5 h-5 text-blue-500" />
          <span className="font-semibold text-sm">Agua</span>
        </div>
        <span className="text-xs text-muted-foreground">
          {waterMl}ml / {metaAgua}ml
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-muted rounded-full overflow-hidden mb-4">
        <div 
          className="h-full bg-blue-500 transition-all duration-300 rounded-full"
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Glasses grid */}
      <div className="flex items-center justify-center flex-wrap gap-1 mb-3">
        {Array.from({ length: maxGlasses }).map((_, i) => {
          const isFilled = i < glasses
          return (
            <button
              key={i}
              type="button"
              onClick={() => toggleGlass(i)}
              className={cn(
                "w-7 h-9 rounded-b-lg rounded-t-sm border-2 transition-all relative overflow-hidden",
                isFilled 
                  ? "border-blue-500 bg-blue-500/20" 
                  : "border-muted-foreground/30 bg-transparent hover:border-blue-300"
              )}
              title={`${(i + 1) * GLASS_ML}ml`}
            >
              {isFilled && (
                <div 
                  className="absolute bottom-0 left-0 right-0 bg-blue-500 transition-all"
                  style={{ height: '70%' }}
                />
              )}
            </button>
          )
        })}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={removeGlass}
          disabled={waterMl === 0}
          className="h-8 w-8 p-0"
        >
          <Minus className="w-4 h-4" />
        </Button>
        <span className="text-sm font-medium min-w-[80px] text-center">
          {glasses} {glasses === 1 ? 'copo' : 'copos'}
        </span>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={addGlass}
          disabled={glasses >= maxGlasses}
          className="h-8 w-8 p-0"
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}
