# TicketDemo

Demo ticket-selling app built with **Turborepo + Bun workspaces**.

## Stack

| Layer    | Tech                                                       |
| -------- | ---------------------------------------------------------- |
| Frontend | Vite + React 19, TanStack Router, TanStack Query, HeroUI, TailwindCSS |
| Backend  | Bun + Hono, Better Auth, Drizzle ORM                       |
| Database | PostgreSQL 16 (Docker Compose)                             |
| Shared   | Zod schemas (packages/schemas)                             |

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
cd packages/db && bun run push && cd ../..

# 5. Seed sample data
cd packages/db && bun run seed && cd ../..

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

## Concurrency Test

Proves that two parallel orders for the last remaining ticket result in exactly one success:

```bash
bun run apps/api/src/concurrency-test.ts
```

## Scripts

| Command            | Description                          |
| ------------------ | ------------------------------------ |
| `bun run dev`      | Start all dev servers via Turborepo  |
| `bun run typecheck`| TypeScript check across monorepo     |
| `bun run lint`     | Lint across monorepo                 |
| `bun run db:push`  | Push Drizzle schema to DB            |
| `bun run db:seed`  | Seed sample events and ticket types  |
