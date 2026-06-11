import { z } from "zod";

// ── Auth ──────────────────────────────────────────────
export const signUpSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
});
export type SignUpInput = z.infer<typeof signUpSchema>;

export const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
export type SignInInput = z.infer<typeof signInSchema>;

// ── Events ────────────────────────────────────────────
export const eventsQuerySchema = z.object({
  search: z.string().optional(),
});
export type EventsQuery = z.infer<typeof eventsQuerySchema>;

export const ticketTypeResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  priceCents: z.number(),
  quantityTotal: z.number(),
  quantitySold: z.number(),
  quantityAvailable: z.number(),
});
export type TicketTypeResponse = z.infer<typeof ticketTypeResponseSchema>;

export const eventResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string(),
  date: z.string(),
  venue: z.string(),
  imageUrl: z.string().nullable(),
});
export type EventResponse = z.infer<typeof eventResponseSchema>;

export const eventDetailResponseSchema = eventResponseSchema.extend({
  ticketTypes: z.array(ticketTypeResponseSchema),
});
export type EventDetailResponse = z.infer<typeof eventDetailResponseSchema>;

// ── Orders ────────────────────────────────────────────
export const orderItemInputSchema = z.object({
  ticketTypeId: z.string(),
  quantity: z.number().int().min(1).max(10),
});

export const createOrderSchema = z.object({
  items: z.array(orderItemInputSchema).min(1),
});
export type CreateOrderInput = z.infer<typeof createOrderSchema>;

export const orderStatusSchema = z.enum(["pending", "paid", "cancelled"]);
export type OrderStatus = z.infer<typeof orderStatusSchema>;

export const orderItemResponseSchema = z.object({
  id: z.string(),
  ticketTypeName: z.string(),
  eventName: z.string(),
  quantity: z.number(),
  unitPriceCents: z.number(),
});
export type OrderItemResponse = z.infer<typeof orderItemResponseSchema>;

export const orderResponseSchema = z.object({
  id: z.string(),
  status: orderStatusSchema,
  totalCents: z.number(),
  items: z.array(orderItemResponseSchema),
  createdAt: z.string(),
});
export type OrderResponse = z.infer<typeof orderResponseSchema>;

// ── Tickets ───────────────────────────────────────────
export const ticketStatusSchema = z.enum(["valid", "used"]);
export type TicketStatus = z.infer<typeof ticketStatusSchema>;

export const ticketResponseSchema = z.object({
  id: z.string(),
  code: z.string(),
  status: ticketStatusSchema,
  eventName: z.string(),
  eventDate: z.string(),
  eventVenue: z.string(),
  ticketTypeName: z.string(),
  createdAt: z.string(),
});
export type TicketResponse = z.infer<typeof ticketResponseSchema>;
