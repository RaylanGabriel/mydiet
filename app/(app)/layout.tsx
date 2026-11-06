import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { BottomNav } from '@/components/bottom-nav'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()

  if (!data?.claims) {
    redirect('/auth/login')
  }

  return (
    <div className="min-h-screen flex flex-col bg-background pt-safe pb-20">
      {/* Faixa atrás da barra de status: o conteúdo rolado não passa por baixo dos ícones */}
      <div aria-hidden className="fixed inset-x-0 top-0 z-50 h-safe-top bg-background" />
      {children}
      <BottomNav />
    </div>
  )
}
