import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { db, client, orders } from "@ticket-demo/db";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";
import { createOrderSchema, orderStatusSchema } from "@ticket-demo/schemas";
import type { OrderResponse } from "@ticket-demo/schemas";
import { auth } from "../auth";
import type { Context } from "hono";
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
  // Deadlock prevention: always acquire row locks in deterministic order.
  const sortedItems = [...items].sort((a, b) =>
    a.ticketTypeId.localeCompare(b.ticketTypeId)
  );
  try {
    const orderId = await client.begin(async (txSql) => {
      const lockedTypes: Array<{ id: string; priceCents: number }> = [];
      for (const item of sortedItems) {
        // SELECT ... FOR UPDATE to lock the ticket type row
        const [tt] = await txSql`
          SELECT id, price_cents, quantity_total
          FROM ticket_types
          WHERE id = ${item.ticketTypeId}
          FOR UPDATE
        `;
        if (!tt) throw new Error(`Ticket type ${item.ticketTypeId} not found`);
        // Sold = paid orders + pending orders that have not expired yet
        const [soldRow] = await txSql`
          SELECT coalesce(sum(oi.quantity), 0)::int AS sold
          FROM order_items oi
          JOIN orders o ON o.id = oi.order_id
          WHERE oi.ticket_type_id = ${item.ticketTypeId}
          AND (o.status = 'paid'
          OR (o.status = 'pending' AND o.expires_at > now()))
        `;
        const available = Number(tt.quantity_total) - Number(soldRow.sold);
        if (item.quantity > available) {
          throw new Error(
            `Insufficient stock for ticket type ${item.ticketTypeId}: requested ${item.quantity}, available ${available}`
          );
        }
        lockedTypes.push({ id: tt.id, priceCents: Number(tt.price_cents) });
      }
      const totalCents = sortedItems.reduce(
        (sum, item, i) => sum + item.quantity * lockedTypes[i].priceCents,
        0
      );
      const newOrderId = nanoid();
      await txSql`
        INSERT INTO orders (id, user_id, status, total_cents, created_at, expires_at)
        VALUES (${newOrderId}, ${user.id}, 'pending', ${totalCents}, now(), now() + interval '10 minutes')
      `;
      for (let i = 0; i < sortedItems.length; i++) {
        const item = sortedItems[i];
        await txSql`
          INSERT INTO order_items (id, order_id, ticket_type_id, quantity, unit_price_cents)
          VALUES (${nanoid()}, ${newOrderId}, ${item.ticketTypeId}, ${item.quantity}, ${lockedTypes[i].priceCents})
        `;
      }
      return newOrderId;
    });
    return c.json({ data: { id: orderId } }, 201);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Order creation failed";
    if (message.includes("Insufficient stock") || message.includes("not found")) {
      return c.json({ error: message }, 409);
    }
    console.error("Order creation error:", err);
    return c.json({ error: "Internal server error" }, 500);
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
    status: orderStatusSchema.parse(order.status),
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
  // Simulate payment processing BEFORE touching the DB (1.5s, always approves)
  await new Promise((resolve) => setTimeout(resolve, 1500));
  try {
    const generatedTickets = await client.begin(async (txSql) => {
      // Atomically claim the order: only ONE concurrent /pay can win this UPDATE.
      const claimed = await txSql`
        UPDATE orders
        SET status = 'paid'
        WHERE id = ${orderId}
        AND user_id = ${user.id}
        AND status = 'pending'
        AND expires_at > now()
        RETURNING id
      `;
      if (claimed.length === 0) throw new Error("NOT_CLAIMABLE");
      // All tickets in ONE batch insert, inside the same transaction.
      const rows = order.items.flatMap((item) =>
        Array.from({ length: item.quantity }, () => ({
          id: nanoid(),
          order_item_id: item.id,
          code: nanoid(12),
          status: "valid",
        }))
      );
      await txSql`
        INSERT INTO tickets ${txSql(rows, "id", "order_item_id", "code", "status")}
      `;
      return rows.map((r) => ({ id: r.id, code: r.code }));
    });
    return c.json({
      data: { orderId, status: "paid", tickets: generatedTickets },
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "NOT_CLAIMABLE") {
      return c.json({ error: "Order already processed or expired" }, 409);
    }
    console.error("Payment error:", err);
    return c.json({ error: "Internal server error" }, 500);
  }
});
export default app;
