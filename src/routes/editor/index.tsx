import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { LoaderEditor } from '@/components/editor/LoaderEditor'
import { authClient } from '#/lib/auth-client'
import {
  createUserProject,
  getMyProjects,
} from '#/lib/editor/projects.functions'
import { createProject } from '#/lib/editor/types'
import { Button } from '#/components/ui/button'

export const Route = createFileRoute('/editor/')({
  loader: async () => {
    try {
      const projects = await getMyProjects({ data: { limit: 5 } })
      return { projects, error: false }
    } catch (err) {
      return { projects: [], error: true }
    }
  },
  component: EditorIndexPage,
})

function EditorIndexPage() {
  const navigate = useNavigate()
  const { data: session, isPending } = authClient.useSession()
  const { projects, error: loaderError } = Route.useLoaderData()
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
      <div className="flex flex-col gap-6 w-full max-w-md">
        <div className="w-full border bg-card p-6 space-y-2">
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
          <Button
            onClick={() => {
              void createNewProject()
            }}
            disabled={isCreating}
            className="w-full"
          >
            {isCreating ? 'Creating...' : 'Create Project'}
          </Button>
        </div>

        <div className="flex items-center w-full gap-3">
          <div className="flex-1 border-t border-input" />
          <span className="text-sm text-muted-foreground">Or</span>
          <div className="flex-1 border-t border-input" />
        </div>

        <div className="w-full border bg-card p-6 space-y-2">
          <h1 className="text-lg font-semibold leading-none tracking-tight">
            Open existing project
          </h1>
          <p className="text-sm text-muted-foreground">
            Continue working on a recent project.
          </p>
          {loaderError ? (
            <div className="space-y-2">
              <p className="text-sm text-destructive">
                Failed to load projects.
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  window.location.reload()
                }}
                className="w-full"
              >
                Retry
              </Button>
            </div>
          ) : projects.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No projects yet. Create your first one above!
            </p>
          ) : (
            <div className="flex flex-col">
              {projects.map((project) => (
                <Button
                  variant="ghost"
                  key={project.id}
                  size="lg"
                  className="justify-start py-5"
                  render={
                    <Link
                      to="/editor/$projectId"
                      params={{ projectId: project.id }}
                    >
                      <div>{project.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(project.updatedAt).toLocaleDateString()}
                      </div>
                    </Link>
                  }
                  nativeButton={false}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
