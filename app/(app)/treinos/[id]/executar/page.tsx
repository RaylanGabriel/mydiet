'use client'

import { use } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { useWorkout } from '@/hooks/use-workouts'
import { WorkoutRunner } from '@/components/workouts/workout-runner'

export default function ExecutarTreinoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { workout, isLoading } = useWorkout(id)

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  if (!workout || workout.workout_exercises.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-muted-foreground">Este treino não tem exercícios ainda.</p>
        <Button asChild variant="outline">
          <Link href={`/treinos/${id}`}>Editar treino</Link>
        </Button>
      </div>
    )
  }

  return <WorkoutRunner workout={workout} />
}
