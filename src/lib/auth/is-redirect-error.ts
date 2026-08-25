// redirect() aus 'next/navigation' wirft intern einen Fehler mit einem
// "NEXT_REDIRECT"-digest, den Next.js selbst verarbeitet. Client-seitige
// try/catch-Bloecke um einen Server-Action-Aufruf muessen diesen Fehler
// durchreichen statt ihn als echten Fehler zu behandeln. `isRedirectError`
// ist keine oeffentliche 'next/navigation'-API, daher hier nachgebaut:
// next/dist/client/components/redirect-error.js
export function isRedirectError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'digest' in error &&
    typeof (error as { digest?: unknown }).digest === 'string' &&
    (error as { digest: string }).digest.startsWith('NEXT_REDIRECT')
  )
}
