import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { nanoid } from "nanoid";
import { events, ticketTypes } from "./schema";

const client = postgres(process.env.DATABASE_URL!, { max: 1 });
const db = drizzle(client);

const seedEvents = [
  {
    id: nanoid(),
    name: "Rock in Sampa 2025",
    slug: "rock-in-sampa-2025",
    description:
      "O maior festival de rock do Brasil reúne bandas nacionais e internacionais em três dias épicos de música, arte e cultura no Autódromo de Interlagos.",
    date: new Date("2025-09-20T16:00:00"),
    venue: "Autódromo de Interlagos, São Paulo",
    imageUrl: null,
  },
  {
    id: nanoid(),
    name: "Techno Underground BH",
    slug: "techno-underground-bh",
    description:
      "Uma noite de techno underground com DJs da cena europeia e brasileira. Experiência imersiva com projeções e som de alta fidelidade.",
    date: new Date("2025-08-15T22:00:00"),
    venue: "Galpão Cine Horto, Belo Horizonte",
    imageUrl: null,
  },
  {
    id: nanoid(),
    name: "Stand-Up Comedy — Fábio Rabin",
    slug: "standup-fabio-rabin",
    description:
      "Fábio Rabin apresenta seu novo show 'Cancelado de Novo' em sessão única com participações especiais surpresa.",
    date: new Date("2025-07-10T20:00:00"),
    venue: "Teatro Renault, São Paulo",
    imageUrl: null,
  },
  {
    id: nanoid(),
    name: "DevFest Nordeste 2025",
    slug: "devfest-nordeste-2025",
    description:
      "Conferência de tecnologia com palestras sobre IA, Cloud, Mobile e Web. Networking, workshops práticos e hackathon de 24h.",
    date: new Date("2025-10-05T08:00:00"),
    venue: "Centro de Convenções, Recife",
    imageUrl: null,
  },
  {
    id: nanoid(),
    name: "Baile do Simonal — Edição de Verão",
    slug: "baile-do-simonal-verao",
    description:
      "O lendário Baile do Simonal volta com uma edição especial de verão ao ar livre. Samba, soul, funk e muita dança à beira-mar.",
    date: new Date("2026-01-18T17:00:00"),
    venue: "Marina da Glória, Rio de Janeiro",
    imageUrl: null,
  },
];

const seedTicketTypes = [
  // Rock in Sampa
  { eventSlug: "rock-in-sampa-2025", name: "Pista", priceCents: 35000, quantityTotal: 500 },
  { eventSlug: "rock-in-sampa-2025", name: "VIP", priceCents: 75000, quantityTotal: 100 },
  { eventSlug: "rock-in-sampa-2025", name: "Camarote", priceCents: 150000, quantityTotal: 30 },
  // Techno Underground
  { eventSlug: "techno-underground-bh", name: "Pista", priceCents: 8000, quantityTotal: 300 },
  { eventSlug: "techno-underground-bh", name: "Open Bar", priceCents: 15000, quantityTotal: 80 },
  // Stand-Up
  { eventSlug: "standup-fabio-rabin", name: "Plateia", priceCents: 12000, quantityTotal: 400 },
  { eventSlug: "standup-fabio-rabin", name: "Frisa", priceCents: 20000, quantityTotal: 60 },
  // DevFest
  { eventSlug: "devfest-nordeste-2025", name: "Individual", priceCents: 15000, quantityTotal: 600 },
  { eventSlug: "devfest-nordeste-2025", name: "VIP + Workshop", priceCents: 30000, quantityTotal: 100 },
  { eventSlug: "devfest-nordeste-2025", name: "Estudante", priceCents: 7500, quantityTotal: 200 },
  // Baile do Simonal
  { eventSlug: "baile-do-simonal-verao", name: "Pista", priceCents: 10000, quantityTotal: 1000 },
  { eventSlug: "baile-do-simonal-verao", name: "Lounge", priceCents: 25000, quantityTotal: 150 },
];

console.log("Seeding events...");
await db.insert(events).values(seedEvents).onConflictDoNothing();

const insertedEvents = await db.select().from(events);
const slugToId = new Map(insertedEvents.map((e) => [e.slug, e.id]));

const ticketTypeRows = seedTicketTypes.map((tt) => ({
  id: nanoid(),
  eventId: slugToId.get(tt.eventSlug)!,
  name: tt.name,
  priceCents: tt.priceCents,
  quantityTotal: tt.quantityTotal,
}));

console.log("Seeding ticket types...");
await db.insert(ticketTypes).values(ticketTypeRows).onConflictDoNothing();

console.log("Seed complete ✓");
await client.end();
