import { createFileRoute, Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  LayoutGrid,
  Film,
  Download,
  ArrowRight,
  Check,
  Sparkles,
  Github,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

export const Route = createFileRoute('/')({ component: LandingPage })

function useFadeIn<T extends HTMLElement>(threshold = 0.15) {
  const ref = useRef<T>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.unobserve(el)
        }
      },
      { threshold },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [threshold])

  return { ref, visible }
}

function LandingPage() {
  return (
    <main className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[600px] bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[20%] right-0 w-[800px] h-[400px] bg-blue-500/5 rounded-full blur-[100px]" />
      </div>

      <Navbar />
      <HeroSection />
      <TrustStrip />
      <FeaturesSection />
      <GallerySection />
      <HowItWorksSection />
      <FinalCTA />
      <Footer />
    </main>
  )
}

function Navbar() {
  return (
    <nav className="page-wrap py-6 flex items-center justify-between">
      <Link to="/" className="flex items-center gap-2.5 group">
        <div className="size-8 flex items-center justify-center">
          <img src="/logo.svg" alt="App logo" loading="eager" />
        </div>
        <span className="font-heading font-bold text-lg tracking-tight">
          Animate Loader
        </span>
      </Link>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          render={<Link to="/editor" />}
          nativeButton={false}
        >
          Editor
        </Button>
        <GithubLink />
        <Button size="sm" render={<Link to="/editor" />} nativeButton={false}>
          Get Started
        </Button>
      </div>
    </nav>
  )
}

function HeroSection() {
  const { ref, visible } = useFadeIn<HTMLDivElement>(0.1)

  return (
    <section ref={ref} className="page-wrap pt-12 pb-20 sm:pt-20 sm:pb-28">
      <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
        <div
          className={`transition-all duration-700 ease-out ${
            visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
          }`}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 mb-6 text-xs font-medium bg-primary/10 text-primary border border-primary/20">
            <Sparkles className="size-3.5" />
            Free pixel SVG animation tool
          </div>

          <h1 className="font-heading text-4xl sm:text-5xl lg:text-[3.5rem] font-extrabold tracking-tight leading-[1.1] mb-5">
            Paint pixels.
            <br />
            <span className="text-primary">Animate SVGs.</span>
          </h1>

          <p className="text-base sm:text-lg text-muted-foreground max-w-md mb-8 leading-relaxed">
            Design frame-by-frame pixel art animations and export them as
            lightweight, scalable SVGs. No plugins, no bloat — just pure code.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              size="lg"
              className="h-10 px-5 text-sm font-semibold shadow-lg shadow-primary/20"
              render={<Link to="/editor" />}
              nativeButton={false}
            >
              Open Editor
              <ArrowRight className="size-4 ml-1.5" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="h-10 px-5 text-sm font-medium"
              render={<Link to="/editor" />}
              nativeButton={false}
            >
              Try Demo
            </Button>
          </div>
        </div>

        <div
          className={`relative transition-all duration-700 delay-150 ease-out ${
            visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
          }`}
        >
          <div className="relative border border-border/60 bg-card/80 shadow-2xl shadow-black/20 backdrop-blur-sm overflow-hidden">
            <div className="flex items-center gap-1.5 px-3 py-2.5 border-b border-border/40 bg-muted/30">
              <div className="size-2.5 rounded-full bg-red-400/80" />
              <div className="size-2.5 rounded-full bg-yellow-400/80" />
              <div className="size-2.5 rounded-full bg-green-400/80" />
              <div className="ml-auto text-[10px] text-muted-foreground font-mono">
                animate-loader.app
              </div>
            </div>
            <img
              src="/editor-screen.png"
              alt="Animate Loader editor showing a pixel grid with painted circles and an animation timeline"
              className="w-full h-auto"
              loading="eager"
            />
          </div>

          <div className="absolute -bottom-6 -left-6 sm:-bottom-8 sm:-left-8 size-20 sm:size-24 border border-border/50 bg-card/90 shadow-lg p-2 animate-float-slow">
            <img
              src="/pulsing.svg"
              alt="Pulsing pixel animation preview"
              className="w-full h-full"
            />
          </div>

          <div className="absolute -top-4 -right-4 sm:-top-6 sm:-right-6 size-16 sm:size-20 border border-border/50 bg-card/90 shadow-lg p-2 animate-float">
            <img
              src="/scanning.svg"
              alt="Animated scanner preview"
              className="w-full h-full"
            />
          </div>
        </div>
      </div>
    </section>
  )
}

function TrustStrip() {
  const { ref, visible } = useFadeIn<HTMLDivElement>()

  return (
    <section ref={ref} className="page-wrap pb-16 sm:pb-24">
      <div
        className={`flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs text-muted-foreground transition-all duration-500 ${
          visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}
      >
        <span className="flex items-center gap-1.5">
          <Check className="size-3.5 text-primary" />
          Pure SVG output
        </span>
        <span className="flex items-center gap-1.5">
          <Check className="size-3.5 text-primary" />
          No external dependencies
        </span>
        <span className="flex items-center gap-1.5">
          <Check className="size-3.5 text-primary" />
          Works in any web stack
        </span>
        <span className="flex items-center gap-1.5">
          <Check className="size-3.5 text-primary" />
          Lightweight & scalable
        </span>
      </div>
    </section>
  )
}

function FeaturesSection() {
  const { ref, visible } = useFadeIn<HTMLDivElement>(0.1)

  const features = [
    {
      title: 'Pixel-Perfect Grid',
      description:
        'Choose from 5×5 up to 16×16 grids. Paint with precision using square or circular brushes.',
      icon: <LayoutGrid className="size-5" />,
    },
    {
      title: 'Frame Timeline',
      description:
        'Add, clone, and reorder frames. Scrub through your animation and preview in real time.',
      icon: <Film className="size-5" />,
    },
    {
      title: 'One-Click Export',
      description:
        'Download your animation as a self-contained SVG with inline CSS keyframes — no libraries required.',
      icon: <Download className="size-5" />,
    },
  ]

  return (
    <section ref={ref} className="page-wrap pb-20 sm:pb-28">
      <div
        className={`text-center mb-12 transition-all duration-700 ${
          visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
        }`}
      >
        <h2 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight mb-3">
          Everything you need
        </h2>
        <p className="text-muted-foreground max-w-lg mx-auto">
          A focused toolkit designed specifically for crafting loader and icon
          animations.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((f, i) => (
          <FeatureCard
            key={f.title}
            feature={f}
            index={i}
            parentVisible={visible}
          />
        ))}
      </div>
    </section>
  )
}

function FeatureCard({
  feature,
  index,
  parentVisible,
}: {
  feature: {
    title: string
    description: string
    icon: React.ReactNode
  }
  index: number
  parentVisible: boolean
}) {
  return (
    <Card
      className={`group border-border/60 bg-card/90 transition-all duration-500 hover:border-primary/30 hover:bg-card hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5 ${
        parentVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
      }`}
      style={{ transitionDelay: `${150 + index * 80}ms` }}
    >
      <CardHeader className="pb-3">
        <div className="w-10 h-10 bg-primary/10 text-primary flex items-center justify-center mb-3 group-hover:bg-primary/15 transition-colors">
          {feature.icon}
        </div>
        <CardTitle className="text-base font-semibold">
          {feature.title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <CardDescription className="text-sm leading-relaxed">
          {feature.description}
        </CardDescription>
      </CardContent>
    </Card>
  )
}

function GallerySection() {
  const { ref, visible } = useFadeIn<HTMLDivElement>(0.1)

  return (
    <section ref={ref} className="page-wrap pb-20 sm:pb-28">
      <div
        className={`text-center mb-12 transition-all duration-700 ${
          visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
        }`}
      >
        <h2 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight mb-3">
          Live animations
        </h2>
        <p className="text-muted-foreground max-w-lg mx-auto">
          SVGs exported from the editor, animated using inline CSS.
        </p>
      </div>

      <div
        className={`grid grid-cols-2 md:grid-cols-4 gap-4 transition-all duration-700 delay-200 ${
          visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
        }`}
      >
        <div className="col-span-2 row-span-2 border border-border/60 bg-card/80 p-4 sm:p-6 flex items-center justify-center overflow-hidden hover:border-primary/30 hover:bg-card transition-all duration-300 group">
          <img
            src="/bill.svg"
            alt="Bill — a detailed animated pixel character"
            className="w-full h-full max-h-90 object-contain transition-transform duration-500"
            loading="lazy"
          />
        </div>

        <div className="border border-border/60 bg-card/80 p-4 flex items-center justify-center overflow-hidden hover:border-primary/30 hover:bg-card transition-all duration-300 group">
          <img
            src="/random.svg"
            alt="Random color pattern animation"
            className="w-full h-full max-h-[140px] object-contain transition-transform duration-500"
            loading="lazy"
          />
        </div>

        <div className="border border-border/60 bg-card/80 p-4 flex items-center justify-center overflow-hidden hover:border-primary/30 hover:bg-card transition-all duration-300 group">
          <img
            src="/floating_head.svg"
            alt="Animated floating pixel face"
            className="w-full h-full max-h-[160px] object-contain transition-transform duration-500"
            loading="lazy"
          />
        </div>

        <div className="border border-border/60 bg-card/80 p-4 flex items-center justify-center overflow-hidden hover:border-primary/30 hover:bg-card transition-all duration-300 group">
          <img
            src="/scanning.svg"
            alt="Scanning pixel animation"
            className="w-full h-full max-h-[140px] object-contain transition-transform duration-500"
            loading="lazy"
          />
        </div>

        <div className="border border-border/60 bg-card/80 p-4 flex items-center justify-center overflow-hidden hover:border-primary/30 hover:bg-card transition-all duration-300 group">
          <img
            src="/pulsing.svg"
            alt="Pulsing ripple animation"
            className="w-full h-full max-h-[140px] object-contain transition-transform duration-500"
            loading="lazy"
          />
        </div>
      </div>
    </section>
  )
}

function HowItWorksSection() {
  const { ref, visible } = useFadeIn<HTMLDivElement>(0.1)

  const steps = [
    {
      num: '01',
      title: 'Choose your grid',
      desc: 'Pick a grid size and frame count that fits your animation.',
    },
    {
      num: '02',
      title: 'Paint each frame',
      desc: 'Use the brush, eraser, fill bucket, and color picker to bring your idea to life.',
    },
    {
      num: '03',
      title: 'Export & use',
      desc: 'Download a self-contained animated SVG ready to drop into any project.',
    },
  ]

  return (
    <section ref={ref} className="page-wrap pb-20 sm:pb-28">
      <div
        className={`text-center mb-12 transition-all duration-700 ${
          visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
        }`}
      >
        <h2 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight mb-3">
          How it works
        </h2>
        <p className="text-muted-foreground max-w-lg mx-auto">
          From blank grid to animated SVG in three simple steps.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-3">
        {steps.map((step, i) => (
          <div
            key={step.num}
            className={`relative text-center p-6 border border-border/60 bg-card/80 transition-all duration-500 hover:bg-card hover:border-border ${
              visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
            }`}
            style={{ transitionDelay: `${200 + i * 100}ms` }}
          >
            <div className="text-4xl font-heading font-extrabold text-primary/30 mb-3">
              {step.num}
            </div>
            <h3 className="font-semibold text-base mb-2">{step.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {step.desc}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}

function FinalCTA() {
  const { ref, visible } = useFadeIn<HTMLDivElement>(0.15)

  return (
    <section ref={ref} className="page-wrap pb-20 sm:pb-28">
      <div
        className={`relative overflow-hidden border border-primary/20 bg-primary/5 px-6 py-14 sm:py-20 text-center transition-all duration-700 ${
          visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
        }`}
      >
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/4 w-64 h-64 bg-primary/10 rounded-full blur-[80px]" />
          <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px]" />
        </div>

        <h2 className="font-heading text-3xl sm:text-4xl font-extrabold tracking-tight mb-4">
          Start creating today
        </h2>
        <p className="text-muted-foreground max-w-md mx-auto mb-8">
          No account required. Open the editor and start painting your first
          animated SVG in seconds.
        </p>
        <Button
          size="lg"
          className="h-10 px-6 text-sm font-semibold shadow-xl shadow-primary/20"
          render={<Link to="/editor" />}
          nativeButton={false}
        >
          Open Editor
          <ArrowRight className="size-4 ml-1.5" />
        </Button>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="border-t border-border/40">
      <div className="page-wrap py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="size-5 bg-primary/90 rounded-sm flex items-center justify-center">
            <LayoutGrid className="size-2.5 text-primary-foreground" />
          </div>
          <span className="font-medium">Animate Loader</span>
        </div>
        <GithubLink />
      </div>
    </footer>
  )
}

function GithubLink() {
  return (
    <a
      href="https://github.com/quantruong158/animate-loader"
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center justify-center size-8 text-muted-foreground hover:text-foreground transition-colors"
      aria-label="GitHub repository"
    >
      <Github className="size-4" />
    </a>
  )
}
