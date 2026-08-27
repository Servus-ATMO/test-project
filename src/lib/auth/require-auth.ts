import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

// Server Actions laufen zwar bereits hinter dem geschuetzten Layout
// (src/app/(protected)/layout.tsx redirect't bei fehlender Session), Server
// Actions sind aber eigene Endpunkte und werden hier zusaetzlich abgesichert
// (Defense in Depth, siehe .claude/rules/backend.md "Always check
// authentication"). RLS ist die dritte, unabhaengige Ebene.
export async function requireAuth() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  if (!data?.claims) {
    redirect('/login')
  }
  return supabase
}
