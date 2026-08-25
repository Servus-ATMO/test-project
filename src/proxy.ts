import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/proxy'

export async function proxy(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Auf alle Pfade anwenden ausser:
     * - _next/static (statische Dateien)
     * - _next/image (Bild-Optimierung)
     * - favicon.ico, robots.txt, sitemap.xml (Crawler/Browser-Dateien, sollen
     *   nie durchs Login-Gate umgeleitet werden - siehe Lighthouse-SEO-Check
     *   nach dem PROJ-2-Deploy, robots.txt landete faelschlich auf /login)
     * - gaengige Bild-Dateiendungen
     */
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
