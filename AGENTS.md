<!-- intent-skills:start -->
# Skill mappings - when working in these areas, load the linked skill file into context.
skills:
  - task: "Setting up or configuring TanStack Start framework"
    load: "node_modules/@tanstack/react-start/skills/react-start/SKILL.md"
  - task: "Working with TanStack Router, route trees, file-based routing"
    load: "node_modules/@tanstack/router-core/skills/router-core/SKILL.md"
  - task: "Implementing authentication, auth guards, and route protection"
    load: "node_modules/@tanstack/router-core/skills/router-core/auth-and-guards/SKILL.md"
  - task: "Creating server functions with createServerFn"
    load: "node_modules/@tanstack/start-client-core/skills/start-core/server-functions/SKILL.md"
  - task: "Adding or debugging React Server Components"
    load: "node_modules/@tanstack/react-start/skills/react-start/server-components/SKILL.md"
  - task: "Configuring deployment to Cloudflare, Netlify, or Vercel"
    load: "node_modules/@tanstack/start-client-core/skills/start-core/deployment/SKILL.md"
  - task: "Managing environment variables with dotenv"
    load: "node_modules/dotenv/skills/dotenv/SKILL.md"
<!-- intent-skills:end -->

<!-- agents:start -->
# TanStack Project Guidelines

This project uses:
- **@tanstack/react-start** - Full-stack React framework
- **@tanstack/react-router** - File-based routing with route trees
- **better-auth** - Authentication solution
- **Drizzle ORM** - Database ORM with PostgreSQL
- **Vite** - Build tool

## Route Structure
- Routes are defined in `src/routes/` using TanStack Router's file-based routing
- Route tree is generated in `src/routeTree.gen.ts`
- API routes use `createServerFn` in `.functions.ts` files

## Environment Variables
- Use `.env.local` for local development secrets
- Prefix client-side vars with `VITE_`
<!-- agents:end -->
