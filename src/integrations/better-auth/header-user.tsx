import { Button } from '#/components/ui/button'
import { authClient } from '#/lib/auth-client'
import { Link } from '@tanstack/react-router'

export default function BetterAuthHeader() {
  const { data: session, isPending } = authClient.useSession()

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
        <Button
          variant="outline"
          onClick={() => {
            void authClient.signOut()
          }}
        >
          Sign out
        </Button>
      </div>
    )
  }

  return (
    <Link
      to="/login"
      className="h-9 px-4 text-sm font-medium bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-50 border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors inline-flex items-center"
    >
      Sign in
    </Link>
  )
}
