'use client'

import useSWR from 'swr'
import { createClient } from '@/lib/supabase/client'
import { getUserId } from '@/lib/supabase/get-user-id'
import type { Profile } from '@/lib/types'

async function fetchProfile(): Promise<Profile | null> {
  const userId = await getUserId()
  if (!userId) return null

  const { data, error } = await createClient()
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) throw error
  return data
}

export function useProfile() {
  const { data, error, isLoading, mutate } = useSWR('profile', fetchProfile, {
    revalidateOnFocus: false,
  })

  const updateProfile = async (updates: Partial<Profile>) => {
    const userId = await getUserId()
    if (!userId) return

    const { error: updateError } = await createClient()
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', userId)
    if (updateError) throw updateError

    await mutate()
  }

  return {
    profile: data,
    isLoading,
    error,
    updateProfile,
    mutate,
  }
}
