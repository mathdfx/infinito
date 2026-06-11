import { Hono } from "hono";
import { db, tickets, orderItems, ticketTypes, events, orders } from "@ticket-demo/db";
import { eq, and } from "drizzle-orm";
import { auth } from "../auth";
import type { Context } from "hono";
import type { TicketResponse } from "@ticket-demo/schemas";

const app = new Hono();

async function getSessionUser(c: Context) {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) return null;
  return session.user;
}

app.get("/", async (c) => {
  const user = await getSessionUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);

  const userTickets = await db
    .select({
      id: tickets.id,
      code: tickets.code,
      status: tickets.status,
      createdAt: tickets.createdAt,
      ticketTypeName: ticketTypes.name,
      eventName: events.name,
      eventDate: events.date,
      eventVenue: events.venue,
    })
    .from(tickets)
    .innerJoin(orderItems, eq(tickets.orderItemId, orderItems.id))
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .innerJoin(ticketTypes, eq(orderItems.ticketTypeId, ticketTypes.id))
    .innerJoin(events, eq(ticketTypes.eventId, events.id))
    .where(and(eq(orders.userId, user.id), eq(orders.status, "paid")))
    .orderBy(tickets.createdAt);

  const result: TicketResponse[] = userTickets.map((t) => ({
    id: t.id,
    code: t.code,
    status: t.status as "valid" | "used",
    eventName: t.eventName,
    eventDate: t.eventDate.toISOString(),
    eventVenue: t.eventVenue,
    ticketTypeName: t.ticketTypeName,
    createdAt: t.createdAt.toISOString(),
  }));

  return c.json({ data: result });
});

export default app;
