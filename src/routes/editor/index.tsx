import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { LoaderEditor } from '@/components/editor/LoaderEditor'
import { authClient } from '#/lib/auth-client'
import { createUserProject } from '#/lib/editor/projects.functions'
import { createProject } from '#/lib/editor/types'

export const Route = createFileRoute('/editor/')({
  component: EditorIndexPage,
})

function EditorIndexPage() {
  const navigate = useNavigate()
  const { data: session, isPending } = authClient.useSession()
  const [name, setName] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState('')

  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-neutral-200 border-t-neutral-900 dark:border-neutral-800 dark:border-t-neutral-100" />
      </div>
    )
  }

  if (!session?.user) {
    return (
      <LoaderEditor
        initialGridSize={7}
        initialFrameCount={8}
        initialFrameRate={12}
      />
    )
  }

  const createNewProject = async () => {
    setError('')
    setIsCreating(true)

    try {
      const trimmedName = name.trim()
      if (!trimmedName) {
        setError('Please enter a project name')
        return
      }

      const result = await createUserProject({
        data: {
          name: trimmedName,
          initialProject: createProject(7, 8, 12),
        },
      })

      await navigate({
        to: '/editor/$projectId',
        params: { projectId: result.id },
      })
    } catch {
      setError('Failed to create project')
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md border bg-card p-6 space-y-4">
        <h1 className="text-lg font-semibold leading-none tracking-tight">
          Create a new project
        </h1>
        <p className="text-sm text-muted-foreground">
          Start by naming your loader project.
        </p>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              void createNewProject()
            }
          }}
          placeholder="My loader"
          className="flex h-9 w-full border border-input bg-background px-3 py-1 text-sm shadow-xs"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="button"
          onClick={() => {
            void createNewProject()
          }}
          disabled={isCreating}
          className="w-full h-9 px-4 text-sm font-medium text-white bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-50 dark:text-neutral-900 dark:hover:bg-neutral-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isCreating ? 'Creating...' : 'Create Project'}
        </button>
      </div>
    </main>
  )
}
