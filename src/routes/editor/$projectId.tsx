import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import { LoaderEditor } from '@/components/editor/LoaderEditor'
import {
  createUserProject,
  deleteUserProject,
  getMyProjects,
  getProjectById,
  saveUserProject,
} from '#/lib/editor/projects.functions'
import { createProject, type Project } from '#/lib/editor/types'

export const Route = createFileRoute('/editor/$projectId')({
  pendingComponent: () => (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-neutral-200 border-t-neutral-900 dark:border-neutral-800 dark:border-t-neutral-100" />
    </div>
  ),
  loader: async ({ params }) => {
    const [project, projects] = await Promise.all([
      getProjectById({ data: { id: params.projectId } }),
      getMyProjects(),
    ])

    if (!project) {
      throw redirect({ to: '/editor' })
    }

    return {
      project,
      projects,
    }
  },
  component: ProjectEditorPage,
})

function ProjectEditorPage() {
  const navigate = useNavigate()
  const { project, projects } = Route.useLoaderData()
  const { projectId } = Route.useParams()
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSavedSnapshotRef = useRef(JSON.stringify(project.data))
  const isHydratedRef = useRef(false)
  const [saveStatus, setSaveStatus] = useState<
    'idle' | 'saving' | 'saved' | 'error'
  >('idle')

  useEffect(() => {
    lastSavedSnapshotRef.current = JSON.stringify(project.data)
    isHydratedRef.current = false
    setSaveStatus('idle')
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [projectId])

  const handleProjectChange = useCallback(
    (nextProject: Project) => {
      const serialized = JSON.stringify(nextProject)

      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
        saveTimeoutRef.current = null
      }

      if (!isHydratedRef.current) {
        if (serialized === lastSavedSnapshotRef.current) {
          isHydratedRef.current = true
          return
        }
        isHydratedRef.current = true
      }

      if (serialized === lastSavedSnapshotRef.current) {
        return
      }

      saveTimeoutRef.current = setTimeout(() => {
        setSaveStatus('saving')
        void saveUserProject({
          data: {
            id: projectId,
            project: nextProject,
          },
        })
          .then(() => {
            lastSavedSnapshotRef.current = serialized
            setSaveStatus('saved')
          })
          .catch(() => {
            setSaveStatus('error')
          })
      }, 800)
    },
    [projectId],
  )

  useEffect(() => {
    if (saveStatus !== 'saved') return
    const timeout = setTimeout(() => setSaveStatus('idle'), 1200)
    return () => clearTimeout(timeout)
  }, [saveStatus])

  return (
    <LoaderEditor
      initialProject={project.data}
      currentProjectId={project.id}
      projects={projects.map((entry) => ({ id: entry.id, name: entry.name }))}
      onProjectSelect={(nextProjectId) => {
        void navigate({
          to: '/editor/$projectId',
          params: { projectId: nextProjectId },
        })
      }}
      onProjectChange={handleProjectChange}
      saveStatus={saveStatus}
      currentProjectName={project.name}
      onAddProject={async (name) => {
        const result = await createUserProject({
          data: {
            name,
            initialProject: createProject(7, 8, 12),
          },
        })

        await navigate({
          to: '/editor/$projectId',
          params: { projectId: result.id },
        })
      }}
      onDeleteProject={async () => {
        const currentIndex = projects.findIndex(
          (entry) => entry.id === project.id,
        )
        const fallback =
          projects.find((entry) => entry.id !== project.id) ?? null

        await deleteUserProject({ data: { id: project.id } })

        if (fallback) {
          await navigate({
            to: '/editor/$projectId',
            params: { projectId: fallback.id },
          })
          return
        }

        if (currentIndex > 0 && projects[currentIndex - 1]) {
          await navigate({
            to: '/editor/$projectId',
            params: { projectId: projects[currentIndex - 1]!.id },
          })
          return
        }

        await navigate({ to: '/editor' })
      }}
    />
  )
}
