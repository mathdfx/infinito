/**
 * Concurrency test: proves that two parallel POST /orders for the last
 * remaining ticket results in exactly one success and one failure.
 *
 * Usage: bun run apps/api/src/concurrency-test.ts
 * Requires: API server running + DB seeded
 */

const API = process.env.API_URL ?? "http://localhost:3000";

async function createUser(name: string, email: string, password: string) {
  const res = await fetch(`${API}/api/auth/sign-up`, {
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
  console.log("=== Concurrency Test ===\n");

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

  // 2. Find a ticket type — we'll pick the one with the smallest availability
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

  // 3. Buy all-but-one tickets to set up the race condition
  // We need to buy until only 1 remains. For simplicity, we'll get current
  // availability and buy (available - 1) tickets first.
  const slugForTarget = eventsList[0].slug;
  const detailBefore = await getEventDetail(slugForTarget);
  const ttBefore = detailBefore.ticketTypes.find(
    (t) => t.id === targetTicketTypeId
  );
  const available = ttBefore?.quantityAvailable ?? 0;

  console.log(`Target: "${targetName}" (available: ${available})`);

  if (available > 1) {
    console.log(`Buying ${available - 1} tickets to leave exactly 1...`);
    const bulkResult = await createOrder(cookie1, targetTicketTypeId, available - 1);
    if (!bulkResult.ok) {
      console.error("Bulk buy failed:", bulkResult.body);
      process.exit(1);
    }
    // Pay to confirm
    const bulkOrder = JSON.parse(bulkResult.body);
    await fetch(`${API}/api/orders/${bulkOrder.data.id}/pay`, {
      method: "POST",
      headers: { Cookie: cookie1 },
    });
  }

  console.log("Exactly 1 ticket should remain.\n");

  // 4. Race: two concurrent orders for the last ticket
  console.log("Firing two concurrent orders for the last ticket...");
  const [r1, r2] = await Promise.all([
    createOrder(cookie1, targetTicketTypeId, 1),
    createOrder(cookie2, targetTicketTypeId, 1),
  ]);

  console.log(`\nUser 1: ${r1.status} — ${r1.body}`);
  console.log(`User 2: ${r2.status} — ${r2.body}`);

  const successes = [r1, r2].filter((r) => r.ok).length;
  const failures = [r1, r2].filter((r) => !r.ok).length;

  console.log(`\nResults: ${successes} success(es), ${failures} failure(s)`);

  if (successes === 1 && failures === 1) {
    console.log("✅ PASS: Race condition handled correctly — only one order succeeded.");
    process.exit(0);
  } else {
    console.error("❌ FAIL: Expected exactly 1 success and 1 failure.");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Test error:", err);
  process.exit(1);
});
