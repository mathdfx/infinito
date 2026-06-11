import { db, ticketTypes, orders, orderItems } from "@ticket-demo/db";
import { eq, inArray } from "drizzle-orm";

/**
 * Pay-Race test:
 * Proves that two parallel POST /orders/:id/pay for the same order
 * results in exactly one success and one failure (already paid),
 * and generates exactly 1 new ticket in GET /api/me/tickets.
 *
 * Usage: bun run apps/api/src/pay-race-test.ts
 * Requires: API server running + DB seeded
 */

const API = process.env.API_URL ?? "http://localhost:3000";

async function createUser(name: string, email: string, password: string) {
  const res = await fetch(`${API}/api/auth/sign-up/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password }),
  });
  if (!res.ok) {
    const body = await res.text();
    if (body.includes("already") || res.status === 422 || res.status === 400) {
      return signIn(email, password);
    }
    throw new Error(`Sign-up failed for ${email}: ${res.status} ${body}`);
  }
  const setCookie = res.headers.get("set-cookie");
  return setCookie ?? "";
}

async function signIn(email: string, password: string) {
  const res = await fetch(`${API}/api/auth/sign-in/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    throw new Error(`Sign-in failed for ${email}: ${res.status}`);
  }
  const setCookie = res.headers.get("set-cookie");
  return setCookie ?? "";
}

async function getEvents() {
  const res = await fetch(`${API}/api/events`);
  const body = await res.json();
  return body.data as Array<{ id: string; slug: string }>;
}

async function getEventDetail(slug: string) {
  const res = await fetch(`${API}/api/events/${slug}`);
  const body = await res.json();
  return body.data as {
    ticketTypes: Array<{ id: string; quantityAvailable: number; name: string }>;
  };
}

async function createOrder(
  cookie: string,
  ticketTypeId: string,
  quantity: number
): Promise<{ ok: boolean; status: number; body: string }> {
  const res = await fetch(`${API}/api/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
    },
    body: JSON.stringify({
      items: [{ ticketTypeId, quantity }],
    }),
  });
  const body = await res.text();
  return { ok: res.ok, status: res.status, body };
}

async function getTicketsCount(cookie: string): Promise<number> {
  const res = await fetch(`${API}/api/me/tickets`, {
    headers: { Cookie: cookie },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch tickets: ${res.status} ${await res.text()}`);
  }
  const body = await res.json();
  return body.data.length;
}

async function main() {
  console.log("=== Pay-Race Concurrency Test ===\n");

  // 1. Authenticate or create a specific test user
  console.log("Authenticating test user...");
  const cookie = await createUser(
    "Pay Race User",
    "payrace@test.com",
    "testpass123"
  );
  console.log("User authenticated.\n");

  // 2. Find a ticket type with stock
  console.log("Finding ticket type with available stock...");
  const eventsList = await getEvents();
  let targetTicketTypeId = "";
  let targetName = "";

  for (const ev of eventsList) {
    const detail = await getEventDetail(ev.slug);
    for (const tt of detail.ticketTypes) {
      if (tt.quantityAvailable >= 1) {
        targetTicketTypeId = tt.id;
        targetName = tt.name;
        break;
      }
    }
    if (targetTicketTypeId) break;
  }

  if (!targetTicketTypeId) {
    console.error("No ticket types with available stock found. Seed the DB first.");
    process.exit(1);
  }

  console.log(`Target: "${targetName}" (id: ${targetTicketTypeId})`);

  // 3. Reset database records for this ticket type and set stock to exactly 1
  console.log("Resetting database records and setting stock to exactly 1...");
  const itemsToClear = await db
    .select({ orderId: orderItems.orderId })
    .from(orderItems)
    .where(eq(orderItems.ticketTypeId, targetTicketTypeId));
  
  if (itemsToClear.length > 0) {
    const orderIds = itemsToClear.map(i => i.orderId);
    await db.delete(orderItems).where(inArray(orderItems.orderId, orderIds));
    await db.delete(orders).where(inArray(orders.id, orderIds));
  }

  await db
    .update(ticketTypes)
    .set({ quantityTotal: 1 })
    .where(eq(ticketTypes.id, targetTicketTypeId));

  console.log("Database updated: exactly 1 ticket is available.\n");

  // 4. Get ticket count before payment
  const countBefore = await getTicketsCount(cookie);
  console.log(`Initial tickets count for user: ${countBefore}`);

  // 5. Create the order
  console.log("Creating order...");
  const orderRes = await createOrder(cookie, targetTicketTypeId, 1);
  if (!orderRes.ok) {
    console.error(`❌ Order creation failed: ${orderRes.status} - ${orderRes.body}`);
    process.exit(1);
  }
  const orderData = JSON.parse(orderRes.body);
  const orderId = orderData.data.id;
  console.log(`Order created successfully: ${orderId}\n`);

  // 6. Fire two concurrent payment requests
  console.log(`--- Firing two concurrent payment requests for order ${orderId} ---`);
  const [payRes1, payRes2] = await Promise.all([
    fetch(`${API}/api/orders/${orderId}/pay`, {
      method: "POST",
      headers: { Cookie: cookie },
    }),
    fetch(`${API}/api/orders/${orderId}/pay`, {
      method: "POST",
      headers: { Cookie: cookie },
    }),
  ]);

  const p1Body = await payRes1.text();
  const p2Body = await payRes2.text();

  console.log(`Payment Request 1: ${payRes1.status} — ${p1Body}`);
  console.log(`Payment Request 2: ${payRes2.status} — ${p2Body}`);

  const paySuccesses = [payRes1, payRes2].filter((r) => r.ok).length;
  const payFailures = [payRes1, payRes2].filter((r) => !r.ok).length;

  console.log(`Results: ${paySuccesses} payment success(es), ${payFailures} failure(s)`);

  if (paySuccesses !== 1 || payFailures !== 1) {
    console.error("❌ FAIL: Expected exactly 1 payment success and 1 failure.");
    process.exit(1);
  }
  console.log("✅ PASS: Payment race condition handled correctly — exactly one payment succeeded.");

  // 7. Get ticket count after payment
  const countAfter = await getTicketsCount(cookie);
  console.log(`Subsequent tickets count for user: ${countAfter}`);

  if (countAfter !== countBefore + 1) {
    console.error(`❌ FAIL: Expected exactly ${countBefore + 1} tickets, but got ${countAfter}`);
    process.exit(1);
  }
  console.log(`✅ PASS: Ticket counts verify exactly 1 new ticket was created.`);

  console.log("\n🎉 ALL PAY-RACE CONCURRENCY TESTS PASSED SUCCESSFULLY! 🎉");
  process.exit(0);
}

main().catch((err) => {
  console.error("Test error:", err);
  process.exit(1);
});

export {};
