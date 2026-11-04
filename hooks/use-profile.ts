'use client'

import useSWR from 'swr'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/lib/types'

async function fetchProfile(): Promise<Profile | null> {
  const supabase = createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error) throw error
  return data
}

export function useProfile() {
  const { data, error, isLoading, mutate } = useSWR('profile', fetchProfile, {
    revalidateOnFocus: false,
  })

  const updateProfile = async (updates: Partial<Profile>) => {
    const supabase = createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', user.id)
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
