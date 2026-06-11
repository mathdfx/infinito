import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import {
  db,
  orders,
  orderItems,
  ticketTypes,
  tickets,
  events,
} from "@ticket-demo/db";
import { eq, sql, and, inArray } from "drizzle-orm";
import { nanoid } from "nanoid";
import { createOrderSchema } from "@ticket-demo/schemas";
import type { OrderResponse } from "@ticket-demo/schemas";
import { auth } from "../auth";
import type { Context } from "hono";
import postgres from "postgres";

const app = new Hono();

async function getSessionUser(c: Context) {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) return null;
  return session.user;
}

app.post("/", zValidator("json", createOrderSchema), async (c) => {
  const user = await getSessionUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);

  const { items } = c.req.valid("json");
  const connectionString = process.env.DATABASE_URL!;
  const txClient = postgres(connectionString);

  try {
    const result = await txClient.begin(async (txSql) => {
      // Lock and verify availability for each ticket type
      const lockedTypes: Array<{
        id: string;
        priceCents: number;
        quantityTotal: number;
        sold: number;
      }> = [];

      for (const item of items) {
        // SELECT ... FOR UPDATE to lock the row
        const [tt] = await txSql`
          SELECT id, price_cents, quantity_total
          FROM ticket_types
          WHERE id = ${item.ticketTypeId}
          FOR UPDATE
        `;

        if (!tt) {
          throw new Error(`Ticket type ${item.ticketTypeId} not found`);
        }

        // Count currently reserved/sold for this ticket type
        const [soldRow] = await txSql`
          SELECT coalesce(sum(oi.quantity), 0)::int AS sold
          FROM order_items oi
          JOIN orders o ON o.id = oi.order_id
          WHERE oi.ticket_type_id = ${item.ticketTypeId}
            AND o.status IN ('pending', 'paid')
        `;

        const sold = Number(soldRow.sold);
        const available = Number(tt.quantity_total) - sold;

        if (item.quantity > available) {
          throw new Error(
            `Insufficient stock for ticket type ${item.ticketTypeId}: requested ${item.quantity}, available ${available}`
          );
        }

        lockedTypes.push({
          id: tt.id,
          priceCents: Number(tt.price_cents),
          quantityTotal: Number(tt.quantity_total),
          sold,
        });
      }

      // Calculate total
      const totalCents = items.reduce((sum, item, i) => {
        return sum + item.quantity * lockedTypes[i].priceCents;
      }, 0);

      // Create order
      const orderId = nanoid();
      await txSql`
        INSERT INTO orders (id, user_id, status, total_cents, created_at)
        VALUES (${orderId}, ${user.id}, 'pending', ${totalCents}, now())
      `;

      // Create order items
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const lt = lockedTypes[i];
        await txSql`
          INSERT INTO order_items (id, order_id, ticket_type_id, quantity, unit_price_cents)
          VALUES (${nanoid()}, ${orderId}, ${item.ticketTypeId}, ${item.quantity}, ${lt.priceCents})
        `;
      }

      return orderId;
    });

    return c.json({ data: { id: result } }, 201);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Order creation failed";
    if (message.includes("Insufficient stock") || message.includes("not found")) {
      return c.json({ error: message }, 409);
    }
    console.error("Order creation error:", err);
    return c.json({ error: "Internal server error" }, 500);
  } finally {
    await txClient.end();
  }
});

app.get("/:id", async (c) => {
  const user = await getSessionUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);

  const orderId = c.req.param("id");
  const order = await db.query.orders.findFirst({
    where: and(eq(orders.id, orderId), eq(orders.userId, user.id)),
    with: {
      items: {
        with: {
          ticketType: {
            with: { event: true },
          },
        },
      },
    },
  });

  if (!order) return c.json({ error: "Order not found" }, 404);

  const result: OrderResponse = {
    id: order.id,
    status: order.status as "pending" | "paid" | "cancelled",
    totalCents: order.totalCents,
    createdAt: order.createdAt.toISOString(),
    items: order.items.map((oi) => ({
      id: oi.id,
      ticketTypeName: oi.ticketType.name,
      eventName: oi.ticketType.event.name,
      quantity: oi.quantity,
      unitPriceCents: oi.unitPriceCents,
    })),
  };

  return c.json({ data: result });
});

app.post("/:id/pay", async (c) => {
  const user = await getSessionUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);

  const orderId = c.req.param("id");
  const order = await db.query.orders.findFirst({
    where: and(eq(orders.id, orderId), eq(orders.userId, user.id)),
    with: { items: true },
  });

  if (!order) return c.json({ error: "Order not found" }, 404);
  if (order.status !== "pending") {
    return c.json({ error: `Order is already ${order.status}` }, 400);
  }

  // Simulate payment processing (1.5s delay, always approves)
  await new Promise((resolve) => setTimeout(resolve, 1500));

  // Generate tickets and update order status
  const generatedTickets: Array<{ id: string; code: string }> = [];

  for (const item of order.items) {
    for (let i = 0; i < item.quantity; i++) {
      const ticketId = nanoid();
      const code = nanoid(12);
      generatedTickets.push({ id: ticketId, code });
      await db.insert(tickets).values({
        id: ticketId,
        orderItemId: item.id,
        code,
        status: "valid",
      });
    }
  }

  await db
    .update(orders)
    .set({ status: "paid" })
    .where(eq(orders.id, orderId));

  return c.json({
    data: {
      orderId,
      status: "paid",
      tickets: generatedTickets,
    },
  });
});

export default app;
