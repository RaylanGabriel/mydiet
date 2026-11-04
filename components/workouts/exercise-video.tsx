'use client'

import { ExternalLink, PlayCircle } from 'lucide-react'
import type { Exercise } from '@/lib/workout-types'

function getYouTubeId(url: string) {
  try {
    const parsed = new URL(url)
    if (parsed.hostname.includes('youtu.be')) return parsed.pathname.slice(1) || null
    if (parsed.hostname.includes('youtube.com')) {
      if (parsed.pathname.startsWith('/shorts/')) return parsed.pathname.split('/')[2] || null
      if (parsed.pathname.startsWith('/embed/')) return parsed.pathname.split('/')[2] || null
      return parsed.searchParams.get('v')
    }
  } catch {
    return null
  }
  return null
}

export function youtubeSearchUrl(exerciseName: string) {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(`${exerciseName} execução correta`)}`
}

export function ExerciseVideo({ exercise }: { exercise: Exercise }) {
  const videoId = exercise.video_url ? getYouTubeId(exercise.video_url) : null

  return (
    <div className="flex flex-col gap-3">
      {videoId ? (
        <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-muted">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${videoId}?rel=0&playsinline=1`}
            title={`Vídeo de execução: ${exercise.nome}`}
            className="absolute inset-0 h-full w-full"
            allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            loading="lazy"
          />
        </div>
      ) : (
        <a
          href={youtubeSearchUrl(exercise.nome)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 rounded-lg border border-dashed border-border bg-muted/50 p-4 text-sm transition-colors hover:bg-muted"
        >
          <PlayCircle className="h-8 w-8 shrink-0 text-primary" aria-hidden="true" />
          <span className="flex-1">
            <span className="block font-medium text-foreground">Ver vídeos de execução</span>
            <span className="block text-muted-foreground">Abre exemplos no YouTube</span>
          </span>
          <ExternalLink className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        </a>
      )}
      {exercise.instrucoes && (
        <p className="text-sm leading-relaxed text-muted-foreground text-pretty">{exercise.instrucoes}</p>
      )}
    </div>
  )
}
