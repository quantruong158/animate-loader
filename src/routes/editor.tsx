import { createFileRoute } from '@tanstack/react-router'
import { LoaderEditor } from '@/components/editor/LoaderEditor'

export const Route = createFileRoute('/editor')({
  component: EditorPage,
})

function EditorPage() {
  return (
    <LoaderEditor
      initialGridSize={7}
      initialFrameCount={8}
      initialFrameRate={12}
    />
  )
}