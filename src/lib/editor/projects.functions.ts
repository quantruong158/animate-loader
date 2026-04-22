import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { and, desc, eq } from 'drizzle-orm'
import { db } from '#/db'
import { loaderProject } from '#/db/schema'
import { auth } from '#/lib/auth'
import type { Project } from './types'

export interface LoaderProjectSummary {
  id: string
  name: string
  updatedAt: Date
}

export interface LoaderProjectRecord {
  id: string
  name: string
  data: Project
  updatedAt: Date
}

async function getCurrentUserId() {
  const session = await auth.api.getSession({
    headers: getRequest().headers,
  })
  return session?.user.id ?? null
}

export const getMyProjects = createServerFn({ method: 'GET' })
  .inputValidator((data: { limit?: number; offset?: number }) => data)
  .handler(
    async ({
      data,
    }: {
      data: { limit?: number; offset?: number }
    }): Promise<LoaderProjectSummary[]> => {
      const userId = await getCurrentUserId()
      if (!userId) return []

      const baseQuery = db
        .select({
          id: loaderProject.id,
          name: loaderProject.name,
          updatedAt: loaderProject.updatedAt,
        })
        .from(loaderProject)
        .where(eq(loaderProject.userId, userId))
        .orderBy(desc(loaderProject.updatedAt))

      if (typeof data.limit === 'number' && data.limit > 0) {
        if (typeof data.offset === 'number' && data.offset > 0) {
          return baseQuery.limit(data.limit).offset(data.offset)
        }
        return baseQuery.limit(data.limit)
      }

      if (typeof data.offset === 'number' && data.offset > 0) {
        return baseQuery.offset(data.offset)
      }

      return baseQuery
    },
  )

export const getProjectById = createServerFn({ method: 'GET' })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }): Promise<LoaderProjectRecord | null> => {
    const userId = await getCurrentUserId()
    if (!userId) return null

    const rows = await db
      .select({
        id: loaderProject.id,
        name: loaderProject.name,
        data: loaderProject.data,
        updatedAt: loaderProject.updatedAt,
      })
      .from(loaderProject)
      .where(
        and(eq(loaderProject.id, data.id), eq(loaderProject.userId, userId)),
      )
      .limit(1)

    return rows[0] ?? null
  })

export const createUserProject = createServerFn({ method: 'POST' })
  .inputValidator((data: { name: string; initialProject: Project }) => data)
  .handler(async ({ data }): Promise<{ id: string }> => {
    const userId = await getCurrentUserId()
    if (!userId) {
      throw new Error('Unauthorized')
    }

    const name = data.name.trim()
    if (!name) {
      throw new Error('Project name is required')
    }

    const id = crypto.randomUUID()
    await db.insert(loaderProject).values({
      id,
      userId,
      name,
      data: data.initialProject,
    })

    return { id }
  })

export const saveUserProject = createServerFn({ method: 'POST' })
  .inputValidator((data: { id: string; project: Project }) => data)
  .handler(async ({ data }): Promise<void> => {
    const userId = await getCurrentUserId()
    if (!userId) {
      throw new Error('Unauthorized')
    }

    await db
      .update(loaderProject)
      .set({
        data: data.project,
        updatedAt: new Date(),
      })
      .where(
        and(eq(loaderProject.id, data.id), eq(loaderProject.userId, userId)),
      )
  })

export const deleteUserProject = createServerFn({ method: 'POST' })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }): Promise<void> => {
    const userId = await getCurrentUserId()
    if (!userId) {
      throw new Error('Unauthorized')
    }

    await db
      .delete(loaderProject)
      .where(
        and(eq(loaderProject.id, data.id), eq(loaderProject.userId, userId)),
      )
  })
