import { createFileRoute, Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export const Route = createFileRoute('/')({ component: LandingPage })

function LandingPage() {
  return (
    <main className="min-h-screen">
      <section className="page-wrap py-24 sm:py-32 text-center">
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
          Design frame-by-frame SVG loader animations
        </h1>
        <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-8">
          Choose your grid size, paint each frame, export a looping animation in
          seconds.
        </p>

        <div className="flex justify-center mb-10">
          <PixelGridPreview />
        </div>

        <Button size="lg" render={<Link to="/editor" />}>
          Open Editor
        </Button>
      </section>

      <section className="page-wrap py-16">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Grid Sizes</CardTitle>
              <CardDescription>From 3x3 to 10x10</CardDescription>
            </CardHeader>
            <CardContent>
              <GridIcon />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Frame-by-Frame</CardTitle>
              <CardDescription>Paint each cell for every frame</CardDescription>
            </CardHeader>
            <CardContent>
              <BrushIcon />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Export SVG</CardTitle>
              <CardDescription>
                Download ready-to-use animated SVG
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ExportIcon />
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="page-wrap py-16">
        <h2 className="text-2xl font-bold text-center mb-12">How It Works</h2>
        <div className="grid gap-8 sm:grid-cols-3">
          <div className="text-center">
            <div className="text-4xl font-bold text-muted-foreground/30 mb-2">
              1
            </div>
            <h3 className="font-semibold mb-2">Choose grid & frames</h3>
            <p className="text-sm text-muted-foreground">
              Select your grid size and number of frames
            </p>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-muted-foreground/30 mb-2">
              2
            </div>
            <h3 className="font-semibold mb-2">Paint each frame</h3>
            <p className="text-sm text-muted-foreground">
              Use the brush tool to color cells
            </p>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-muted-foreground/30 mb-2">
              3
            </div>
            <h3 className="font-semibold mb-2">Export your animation</h3>
            <p className="text-sm text-muted-foreground">
              Download as animated SVG
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}

function PixelGridPreview() {
  return (
    <div className="inline-grid grid-cols-6 gap-1 p-4 bg-muted rounded-xl">
      {Array.from({ length: 36 }).map((_, i) => (
        <div
          key={i}
          className="w-3 h-3 rounded-sm bg-primary animate-pulse"
          style={{
            animationDelay: `${(i % 6) * 100}ms`,
          }}
        />
      ))}
    </div>
  )
}

function GridIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
    </svg>
  )
}

function BrushIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M9.06 11.9l8.07-8.06a2.85 2.85 0 1 1 4.03 4.03l-8.06 8.08" />
      <path d="M7.07 14.94c-1.66 0-3 1.35-3 3.02 0 1.33-2.5 1.52-2 2.02 1.08 1.1 2.49 2.02 4 2.02 2.2 0 4-1.8 4-4.04a3.01 3.01 0 0 0-3-3.02z" />
    </svg>
  )
}

function ExportIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  )
}
