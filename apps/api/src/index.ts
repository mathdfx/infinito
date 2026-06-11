import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { auth } from "./auth";
import eventsRoutes from "./routes/events";
import ordersRoutes from "./routes/orders";
import ticketsRoutes from "./routes/tickets";

const app = new Hono();

app.use("*", logger());
app.use(
  "*",
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

// Health check
app.get("/api/health", (c) => c.json({ status: "ok" }));

// Better Auth handler
app.on(["POST", "GET"], "/api/auth/**", (c) => {
  return auth.handler(c.req.raw);
});

// Domain routes
app.route("/api/events", eventsRoutes);
app.route("/api/orders", ordersRoutes);
app.route("/api/me/tickets", ticketsRoutes);

const port = Number(process.env.PORT) || 3000;
console.log(`API server running on http://localhost:${port}`);

export default {
  port,
  fetch: app.fetch,
};
