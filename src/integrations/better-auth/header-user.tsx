import { Button } from '#/components/ui/button'
import { authClient } from '#/lib/auth-client'
import { Link, useNavigate } from '@tanstack/react-router'

export default function BetterAuthHeader() {
  const navigate = useNavigate()
  const { data: session, isPending } = authClient.useSession()
  const logout = async () => {
    await authClient.signOut()
    void navigate({ to: '/editor' })
  }

  if (isPending) {
    return (
      <div className="h-8 w-8 bg-neutral-100 dark:bg-neutral-800 animate-pulse" />
    )
  }

  if (session?.user) {
    return (
      <div className="flex items-center gap-1">
        {session.user.image ? (
          <img
            src={session.user.image}
            alt="User image"
            className="size-8 border border-border"
          />
        ) : (
          <div className="size-7 bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
            <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
              {session.user.name.charAt(0).toUpperCase() || 'U'}
            </span>
          </div>
        )}
        <Button variant="outline" onClick={logout}>
          Sign out
        </Button>
      </div>
    )
  }

  return (
    <Button variant={'outline'} render={<Link to="/login">Sign in</Link>} />
  )
}
