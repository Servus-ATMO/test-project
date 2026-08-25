// Verhindert Open-Redirect: akzeptiert nur relative Pfade innerhalb der App
// als Weiterleitungsziel, alles andere faellt auf den Default-Pfad zurueck.
export function getSafeRedirectPath(
  path: string | null | undefined,
  fallback = '/dashboard'
): string {
  if (!path) return fallback
  if (!path.startsWith('/') || path.startsWith('//') || path.includes('://')) {
    return fallback
  }
  return path
}
