import { db, ticketTypes, orders, orderItems } from "@ticket-demo/db";
import { eq, inArray } from "drizzle-orm";

/**
 * Concurrency and Pay-Race test:
 * Phase 1: Proves that two parallel POST /orders for the last remaining ticket
 *          results in exactly one success and one failure.
 * Phase 2: Proves that two parallel POST /orders/:id/pay for the same order
 *          results in exactly one success and one failure (already paid).
 *
 * Usage: bun run apps/api/src/concurrency-test.ts
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
    // User might already exist, try sign-in
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

async function main() {
  console.log("=== Concurrency & Pay-Race Test ===\n");

  // 1. Create two test users
  console.log("Creating test users...");
  const cookie1 = await createUser(
    "Concurrency User 1",
    "concurrent1@test.com",
    "testpass123"
  );
  const cookie2 = await createUser(
    "Concurrency User 2",
    "concurrent2@test.com",
    "testpass123"
  );
  console.log("Users ready.\n");

  // 2. Find a ticket type
  console.log("Finding ticket type with limited stock...");
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
  // Clear any existing orders referencing this ticket type to ensure 0 sold
  const itemsToClear = await db
    .select({ orderId: orderItems.orderId })
    .from(orderItems)
    .where(eq(orderItems.ticketTypeId, targetTicketTypeId));
  
  if (itemsToClear.length > 0) {
    const orderIds = itemsToClear.map(i => i.orderId);
    await db.delete(orderItems).where(inArray(orderItems.orderId, orderIds));
    await db.delete(orders).where(inArray(orders.id, orderIds));
  }

  // Update target ticket type total quantity to 1
  await db
    .update(ticketTypes)
    .set({ quantityTotal: 1 })
    .where(eq(ticketTypes.id, targetTicketTypeId));

  console.log("Database updated: exactly 1 ticket is available.\n");

  // --- PHASE 1: Order Reservation Race ---
  console.log("--- PHASE 1: Firing two concurrent order requests for the last ticket ---");
  const [r1, r2] = await Promise.all([
    createOrder(cookie1, targetTicketTypeId, 1),
    createOrder(cookie2, targetTicketTypeId, 1),
  ]);

  console.log(`User 1 Reservation: ${r1.status} — ${r1.body}`);
  console.log(`User 2 Reservation: ${r2.status} — ${r2.body}`);

  const successes = [r1, r2].filter((r) => r.ok).length;
  const failures = [r1, r2].filter((r) => !r.ok).length;

  console.log(`Results: ${successes} reservation success(es), ${failures} failure(s)`);

  if (successes !== 1 || failures !== 1) {
    console.error("❌ FAIL Phase 1: Expected exactly 1 reservation success and 1 failure.");
    process.exit(1);
  }
  console.log("✅ PASS Phase 1: Order race condition handled correctly.\n");

  // Find the successful order ID to clean up or use
  const successRes = r1.ok ? r1 : r2;
  const successUserCookie = r1.ok ? cookie1 : cookie2;
  const orderData = JSON.parse(successRes.body);
  const orderId = orderData.data.id;

  // --- PHASE 2: Payment Processing Race ---
  console.log("--- PHASE 2: Firing two concurrent payment requests for order " + orderId + " ---");
  
  // Launch both requests concurrently
  const [payRes1, payRes2] = await Promise.all([
    fetch(`${API}/api/orders/${orderId}/pay`, {
      method: "POST",
      headers: { Cookie: successUserCookie },
    }),
    fetch(`${API}/api/orders/${orderId}/pay`, {
      method: "POST",
      headers: { Cookie: successUserCookie },
    }),
  ]);

  const p1Body = await payRes1.text();
  const p2Body = await payRes2.text();

  console.log(`Payment Request 1: ${payRes1.status} — ${p1Body}`);
  console.log(`Payment Request 2: ${payRes2.status} — ${p2Body}`);

  const paySuccesses = [payRes1, payRes2].filter((r) => r.ok).length;
  const payFailures = [payRes1, payRes2].filter((r) => !r.ok).length;

  console.log(`Results: ${paySuccesses} payment success(es), ${payFailures} failure(s)`);

  if (paySuccesses === 1 && payFailures === 1) {
    console.log("✅ PASS Phase 2: Payment race condition handled correctly — exactly one payment succeeded.");
    console.log("\n🎉 ALL CONCURRENCY TESTS PASSED SUCCESSFULLY! 🎉");
    process.exit(0);
  } else {
    console.error("❌ FAIL Phase 2: Expected exactly 1 payment success and 1 failure.");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Test error:", err);
  process.exit(1);
});

export {};
