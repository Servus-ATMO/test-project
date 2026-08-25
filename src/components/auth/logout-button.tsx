import { Button } from '@/components/ui/button'
import { logout } from '@/lib/auth/actions'

// Bewusst als Server Component mit <form action> statt Client-Komponente -
// funktioniert auch ganz ohne Client-JS (siehe PROJ-2 Tech Design).
export function LogoutButton() {
  return (
    <form action={logout}>
      <Button type="submit" variant="outline" size="sm">
        Logout
      </Button>
    </form>
  )
}
