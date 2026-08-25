// Zentrale Validierung, damit fehlende ENV-Variablen mit einer verständlichen
// Fehlermeldung auffallen statt erst tief im Supabase-SDK mit einem kryptischen
// Fehler zu crashen (siehe PROJ-1 Edge Cases).
export function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

  if (!url || !publishableKey) {
    throw new Error(
      'Supabase ist nicht konfiguriert: NEXT_PUBLIC_SUPABASE_URL und/oder ' +
        'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY fehlen in .env.local. ' +
        'Siehe .env.local.example für die benötigten Variablen.'
    )
  }

  return { url, publishableKey }
}
