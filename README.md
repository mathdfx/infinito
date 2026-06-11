# TicketDemo

Demo ticket-selling app built with **Turborepo + Bun workspaces**.

## Stack

| Layer    | Tech                                                       |
| -------- | ---------------------------------------------------------- |
| Frontend | Vite + React 19, TanStack Router, TanStack Query, HeroUI, TailwindCSS |
| Backend  | Bun + Hono, Better Auth, Drizzle ORM                       |
| Database | PostgreSQL 16 (Docker Compose)                             |
| Shared   | Zod schemas (packages/schemas)                             |

## Stack Deviations

- **HeroUI & Tailwind:** HeroUI v2 + Tailwind 3 is used instead of HeroUI v3 for compatibility.
- **Icons:** Solar icons are served via `@iconify/react`.

## Quick Start

```bash
# 1. Clone and install
bun install

# 2. Start PostgreSQL
docker compose up -d

# 3. Copy env files (already pre-configured for local dev)
cp apps/api/.env.example apps/api/.env    # if not present
cp apps/web/.env.example apps/web/.env    # if not present

# 4. Push database schema
bun run db:push

# 5. Seed sample data
bun run db:seed

# 6. Start dev servers
bun run dev
```

- **Frontend:** http://localhost:5173
- **API:** http://localhost:3000

## Flow

1. **Sign up** at `/login`
2. **Browse events** at `/eventos`
3. **Select tickets** on an event detail page
4. **Pay** on the checkout page
5. **View QR tickets** at `/meus-ingressos`

## Concurrency & Race Tests

Verify safety under parallel requests (runs require the API server running + DB seeded):

- **Concurrency & Pay-Race Suite:** Asserts both order reservation and payment concurrency. Proves that only one user can reserve the last ticket when ordering concurrently, and that double-submitting a payment on a pending order results in exactly one success:
  ```bash
  bun --env-file=apps/api/.env apps/api/src/concurrency-test.ts
  ```

## Scripts

| Command            | Description                          |
| ------------------ | ------------------------------------ |
| `bun run dev`      | Start all dev servers via Turborepo  |
| `bun run typecheck`| TypeScript check across monorepo     |
| `bun run lint`     | Lint across monorepo (using oxlint)  |
| `bun run db:push`  | Push Drizzle schema to DB            |
| `bun run db:seed`  | Seed sample events and ticket types  |
