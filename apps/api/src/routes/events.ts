import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { db, events, ticketTypes, orderItems, orders } from "@ticket-demo/db";
import { eq, ilike, sql } from "drizzle-orm";
import { eventsQuerySchema } from "@ticket-demo/schemas";
import type { EventResponse, EventDetailResponse } from "@ticket-demo/schemas";

const app = new Hono();

app.get("/", zValidator("query", eventsQuerySchema), async (c) => {
  const { search } = c.req.valid("query");

  const rows = search
    ? await db
        .select()
        .from(events)
        .where(ilike(events.name, `%${search}%`))
        .orderBy(events.date)
    : await db.select().from(events).orderBy(events.date);

  const result: EventResponse[] = rows.map((e) => ({
    id: e.id,
    name: e.name,
    slug: e.slug,
    description: e.description,
    date: e.date.toISOString(),
    venue: e.venue,
    imageUrl: e.imageUrl,
  }));

  return c.json({ data: result });
});

app.get("/:slug", async (c) => {
  const slug = c.req.param("slug");

  const event = await db.query.events.findFirst({
    where: eq(events.slug, slug),
    with: { ticketTypes: true },
  });

  if (!event) {
    return c.json({ error: "Event not found" }, 404);
  }

  // Calculate sold quantities per ticket type
  const soldRows = await db
    .select({
      ticketTypeId: orderItems.ticketTypeId,
      sold: sql<number>`coalesce(sum(${orderItems.quantity}), 0)`.as("sold"),
    })
    .from(orderItems)
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .where(
      sql`${orderItems.ticketTypeId} IN (${sql.join(
        event.ticketTypes.map((tt) => sql`${tt.id}`),
        sql`, `
      )}) AND ${orders.status} IN ('pending', 'paid')`
    )
    .groupBy(orderItems.ticketTypeId);

  const soldMap = new Map(soldRows.map((r) => [r.ticketTypeId, Number(r.sold)]));

  const result: EventDetailResponse = {
    id: event.id,
    name: event.name,
    slug: event.slug,
    description: event.description,
    date: event.date.toISOString(),
    venue: event.venue,
    imageUrl: event.imageUrl,
    ticketTypes: event.ticketTypes.map((tt) => {
      const sold = soldMap.get(tt.id) ?? 0;
      return {
        id: tt.id,
        name: tt.name,
        priceCents: tt.priceCents,
        quantityTotal: tt.quantityTotal,
        quantitySold: sold,
        quantityAvailable: tt.quantityTotal - sold,
      };
    }),
  };

  return c.json({ data: result });
});

export default app;
