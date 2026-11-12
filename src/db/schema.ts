import { sql } from "drizzle-orm";
import { boolean, index, integer, pgTable, serial, text, timestamp, unique } from "drizzle-orm/pg-core";

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  tagline: text("tagline").notNull(),
  emoji: text("emoji").notNull(),
  imageUrl: text("image_url").notNull(),
  accent: text("accent").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const products = pgTable(
  "products",
  {
    id: serial("id").primaryKey(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    brand: text("brand").notNull(),
    categorySlug: text("category_slug").notNull(),
    unit: text("unit").notNull(),
    priceCents: integer("price_cents").notNull(),
    compareAtCents: integer("compare_at_cents"),
    imageUrl: text("image_url").notNull(),
    description: text("description").notNull(),
    tags: text("tags")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    highlights: text("highlights")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    ratingBp: integer("rating_bp").notNull().default(480),
    reviewCount: integer("review_count").notNull().default(0),
    stock: integer("stock").notNull().default(50),
    isActive: boolean("is_active").notNull().default(true),
    badge: text("badge"),
    isOrganic: boolean("is_organic").notNull().default(false),
    isVegan: boolean("is_vegan").notNull().default(false),
    isBestseller: boolean("is_bestseller").notNull().default(false),
    isNew: boolean("is_new").notNull().default(false),
    popularity: integer("popularity").notNull().default(50),
    origin: text("origin").notNull().default("Locally sourced"),
    storage: text("storage").notNull().default("Keep in a cool, dry place."),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (table) => [index("products_category_idx").on(table.categorySlug), index("products_active_idx").on(table.isActive)],
);

export const offers = pgTable("offers", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  eyebrow: text("eyebrow").notNull(),
  title: text("title").notNull(),
  subtitle: text("subtitle").notNull(),
  ctaLabel: text("cta_label").notNull(),
  href: text("href").notNull(),
  theme: text("theme").notNull().default("emerald"),
  badge: text("badge").notNull(),
  emoji: text("emoji").notNull(),
  imageUrl: text("image_url"),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const bundles = pgTable("bundles", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  subtitle: text("subtitle").notNull(),
  itemSlugs: text("item_slugs")
    .array()
    .notNull()
    .default(sql`'{}'::text[]`),
  priceCents: integer("price_cents").notNull(),
  compareAtCents: integer("compare_at_cents").notNull(),
  badge: text("badge").notNull(),
  theme: text("theme").notNull().default("emerald"),
  emoji: text("emoji").notNull(),
  imageUrl: text("image_url").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const coupons = pgTable("coupons", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  description: text("description").notNull(),
  kind: text("kind").notNull().default("percent"),
  percentOff: integer("percent_off"),
  valueCents: integer("value_cents"),
  minSubtotalCents: integer("min_subtotal_cents").notNull().default(0),
  active: boolean("active").notNull().default(true),
});

export const carts = pgTable("carts", {
  id: serial("id").primaryKey(),
  token: text("token").notNull().unique(),
  userId: integer("user_id"),
  couponCode: text("coupon_code"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const cartItems = pgTable(
  "cart_items",
  {
    id: serial("id").primaryKey(),
    cartId: integer("cart_id").notNull(),
    productId: integer("product_id").notNull(),
    quantity: integer("quantity").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique("cart_items_cart_product_unique").on(table.cartId, table.productId), index("cart_items_cart_idx").on(table.cartId)],
);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  phone: text("phone").notNull().default(""),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("customer"),
  isActive: boolean("is_active").notNull().default(true),
  marketingOptIn: boolean("marketing_opt_in").notNull().default(true),
  notifyEmail: boolean("notify_email").notNull().default(true),
  notifyWhatsapp: boolean("notify_whatsapp").notNull().default(false),
  whatsappNumber: text("whatsapp_number").notNull().default(""),
  orderUpdatesEmail: boolean("order_updates_email").notNull().default(true),
  orderUpdatesSms: boolean("order_updates_sms").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sessions = pgTable(
  "sessions",
  {
    id: serial("id").primaryKey(),
    token: text("token").notNull().unique(),
    userId: integer("user_id").notNull(),
    userAgent: text("user_agent").notNull().default(""),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("sessions_user_idx").on(table.userId), index("sessions_expires_idx").on(table.expiresAt)],
);

export const addresses = pgTable(
  "addresses",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    label: text("label").notNull().default("Home"),
    recipient: text("recipient").notNull(),
    line1: text("line1").notNull(),
    line2: text("line2").notNull().default(""),
    city: text("city").notNull(),
    postcode: text("postcode").notNull(),
    phone: text("phone").notNull().default(""),
    instructions: text("instructions").notNull().default(""),
    isDefault: boolean("is_default").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("addresses_user_idx").on(table.userId)],
);

export const savedItems = pgTable(
  "saved_items",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    productSlug: text("product_slug").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique("saved_items_user_product_unique").on(table.userId, table.productSlug)],
);

export const orders = pgTable(
  "orders",
  {
    id: serial("id").primaryKey(),
    orderNumber: text("order_number").notNull().unique(),
    checkoutId: text("checkout_id").unique(),
    userId: integer("user_id"),
    customerName: text("customer_name").notNull(),
    email: text("email").notNull(),
    phone: text("phone").notNull().default(""),
    address: text("address").notNull(),
    city: text("city").notNull(),
    postcode: text("postcode").notNull(),
    deliverySlot: text("delivery_slot").notNull(),
    paymentMethod: text("payment_method").notNull(),
    notes: text("notes").notNull().default(""),
    subtotalCents: integer("subtotal_cents").notNull(),
    savingsCents: integer("savings_cents").notNull(),
    deliveryCents: integer("delivery_cents").notNull(),
    discountCents: integer("discount_cents").notNull(),
    totalCents: integer("total_cents").notNull(),
    couponCode: text("coupon_code"),
    itemCount: integer("item_count").notNull().default(0),
    status: text("status").notNull().default("confirmed"),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("orders_user_idx").on(table.userId),
    index("orders_email_idx").on(table.email),
    index("orders_created_idx").on(table.createdAt),
  ],
);

export const orderItems = pgTable(
  "order_items",
  {
    id: serial("id").primaryKey(),
    orderId: integer("order_id").notNull(),
    productSlug: text("product_slug").notNull(),
    name: text("name").notNull(),
    unit: text("unit").notNull(),
    imageUrl: text("image_url").notNull(),
    priceCents: integer("price_cents").notNull(),
    compareAtCents: integer("compare_at_cents"),
    quantity: integer("quantity").notNull(),
  },
  (table) => [index("order_items_order_idx").on(table.orderId)],
);

/**
 * Admin/staff audit trail. Every mutation through /api/admin writes one row so the
 * owner can see who changed a price, refunded an order or paused the store.
 */
export const auditLogs = pgTable(
  "audit_logs",
  {
    id: serial("id").primaryKey(),
    actorId: integer("actor_id"),
    actorEmail: text("actor_email").notNull().default(""),
    action: text("action").notNull(),
    entity: text("entity").notNull(),
    entityId: text("entity_id").notNull().default(""),
    detail: text("detail").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("audit_created_idx").on(table.createdAt)],
);

/** Single-row store configuration managed from /admin/settings. */
export const storeSettings = pgTable("store_settings", {
  id: integer("id").primaryKey().default(1),
  storeOpen: boolean("store_open").notNull().default(true),
  announcement: text("announcement").notNull().default("Free delivery over $35"),
  supportEmail: text("support_email").notNull().default("hello@fresco.demo"),
  deliveryFeeCents: integer("delivery_fee_cents").notNull().default(399),
  freeDeliveryThresholdCents: integer("free_delivery_threshold_cents").notNull().default(3500),
  /** Shortage-alert lead time in whole days (1–3). */
  shortageLeadDays: integer("shortage_lead_days").notNull().default(1),
  /** Roles that receive internal shortage alerts. */
  alertRoles: text("alert_roles").array().notNull().default(sql`'{admin,stock_manager}'::text[]`),
  demoEmail: text("demo_email").notNull().default(""),
  demoName: text("demo_name").notNull().default(""),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Single-use password reset tokens. Only the SHA-256 digest is stored, so a
 * database leak cannot be used to take over accounts. Rows expire after an hour.
 */
export const passwordResets = pgTable(
  "password_resets",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    tokenHash: text("token_hash").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("password_resets_user_idx").on(table.userId)],
);

/* ───────────────────────── Recurring grocery lists ─────────────────────────
   Backend-only phase. Design notes:
   • Only gateway tokens are stored (never card data). See payment_methods.
   • recurring_runs has a UNIQUE (list_id, occurrence_key) constraint: that is the
     scheduler's double-run/double-charge guard.
   • Stock is decremented with a conditional UPDATE at reservation time, so two
     buyers can never take the same last item.
   • Every state change is appended to recurring_run_events (audit log).
--------------------------------------------------------------------------- */

export const paymentMethods = pgTable(
  "payment_methods",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    // Gateway tokens only — no PAN, no CVV, no expiry beyond display metadata.
    gateway: text("gateway").notNull().default("stripe"),
    gatewayCustomerToken: text("gateway_customer_token").notNull(),
    gatewayPaymentMethodToken: text("gateway_payment_method_token").notNull(),
    brand: text("brand").notNull().default("card"),
    last4: text("last4").notNull().default(""),
    expMonth: integer("exp_month"),
    expYear: integer("exp_year"),
    isDefault: boolean("is_default").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("payment_methods_user_idx").on(table.userId),
    unique("payment_methods_token_unique").on(table.gateway, table.gatewayPaymentMethodToken),
  ],
);

export const recurringLists = pgTable(
  "recurring_lists",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    name: text("name").notNull(),
    status: text("status").notNull().default("active"), // active | paused | cancelled
    cadence: text("cadence").notNull(), // daily | weekly | monthly
    /** Local wall-clock time "HH:MM" in the list's own timezone. */
    localTime: text("local_time").notNull(),
    timezone: text("timezone").notNull().default("UTC"),
    /** ISO date for monthly cadence anchoring (1–31, clamped per month). */
    anchorDay: integer("anchor_day"),
    /** 0=Sun … 6=Sat for weekly cadence. */
    anchorWeekday: integer("anchor_weekday"),
    shortagePolicy: text("shortage_policy").notNull().default("partial"), // skip_item | partial | hold
    paymentMethodId: integer("payment_method_id").notNull(),
    /** Explicit consent to automatic off-session charges. */
    consentAt: timestamp("consent_at", { withTimezone: true }).notNull(),
    consentVersion: text("consent_version").notNull().default("2026-01"),
    consentIp: text("consent_ip").notNull().default(""),
    leadTimeHours: integer("lead_time_hours").notNull().default(24),
    /** Skip exactly one upcoming occurrence. */
    skipNextAt: timestamp("skip_next_at", { withTimezone: true }),
    /** Postpone the next occurrence to this instant (then normal cadence resumes). */
    delayUntil: timestamp("delay_until", { withTimezone: true }),
    pausedReason: text("paused_reason"),
    nextRunAt: timestamp("next_run_at", { withTimezone: true }),
    lastRunAt: timestamp("last_run_at", { withTimezone: true }),
    consecutiveFailures: integer("consecutive_failures").notNull().default(0),
    completedRuns: integer("completed_runs").notNull().default(0),
    skipCount: integer("skip_count").notNull().default(0),
    addressLabel: text("address_label").notNull().default("Home"),
    addressLine1: text("address_line1").notNull().default(""),
    addressCity: text("address_city").notNull().default(""),
    addressPostcode: text("address_postcode").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("recurring_lists_user_idx").on(table.userId),
    index("recurring_lists_due_idx").on(table.status, table.nextRunAt),
  ],
);

export const recurringListItems = pgTable(
  "recurring_list_items",
  {
    id: serial("id").primaryKey(),
    listId: integer("list_id").notNull(),
    productId: integer("product_id").notNull(),
    quantity: integer("quantity").notNull(),
    /** Price captured when the customer built the list, for change detection. */
    priceAtCreationCents: integer("price_at_creation_cents").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique("recurring_list_items_unique").on(table.listId, table.productId)],
);

/**
 * One row per (list, occurrence). The UNIQUE constraint is what makes the
 * scheduler safe to run twice or on N servers: the second claim loses cleanly.
 */
export const recurringRuns = pgTable(
  "recurring_runs",
  {
    id: serial("id").primaryKey(),
    listId: integer("list_id").notNull(),
    occurrenceKey: text("occurrence_key").notNull(),
    scheduledFor: timestamp("scheduled_for", { withTimezone: true }).notNull(),
    state: text("state").notNull().default("scheduled"),
    /** Stable per-run key reused for every charge attempt (idempotency). */
    idempotencyKey: text("idempotency_key").notNull().unique(),
    attemptCount: integer("attempt_count").notNull().default(0),
    nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true }),
    amountCents: integer("amount_cents").notNull().default(0),
    orderId: integer("order_id"),
    orderNumber: text("order_number"),
    chargeToken: text("charge_token"),
    failureCode: text("failure_code"),
    failureMessage: text("failure_message"),
    priceChanged: boolean("price_changed").notNull().default(false),
    priorityScore: integer("priority_score").notNull().default(0),
    decisionReason: text("decision_reason").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("recurring_runs_list_occurrence_unique").on(table.listId, table.occurrenceKey),
    index("recurring_runs_state_idx").on(table.state),
  ],
);

/** Append-only audit of every state transition and allocation decision. */
export const recurringRunEvents = pgTable(
  "recurring_run_events",
  {
    id: serial("id").primaryKey(),
    runId: integer("run_id"),
    listId: integer("list_id").notNull(),
    fromState: text("from_state"),
    toState: text("to_state").notNull(),
    reason: text("reason").notNull().default(""),
    actor: text("actor").notNull().default("scheduler"),
    detail: text("detail").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("recurring_run_events_list_idx").on(table.listId)],
);

/** Reserved stock. Decrements products.stock atomically; release adds it back. */
export const stockReservations = pgTable(
  "stock_reservations",
  {
    id: serial("id").primaryKey(),
    runId: integer("run_id").notNull(),
    status: text("status").notNull().default("active"), // active | released | consumed
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("stock_reservations_run_idx").on(table.runId)],
);

export const stockReservationItems = pgTable(
  "stock_reservation_items",
  {
    id: serial("id").primaryKey(),
    reservationId: integer("reservation_id").notNull(),
    productId: integer("product_id").notNull(),
    quantity: integer("quantity").notNull(),
    /** Quantity the customer asked for; shortfall = requested - quantity. */
    requestedQuantity: integer("requested_quantity").notNull(),
    unitPriceCents: integer("unit_price_cents").notNull(),
  },
  (table) => [index("stock_reservation_items_res_idx").on(table.reservationId)],
);

/** Notification outbox. No transport is wired in this store yet, by design. */
export const notificationEvents = pgTable(
  "notification_events",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id"),
    listId: integer("list_id"),
    runId: integer("run_id"),
    type: text("type").notNull(),
    channel: text("channel").notNull().default("email"),
    title: text("title").notNull(),
    body: text("body").notNull(),
    payload: text("payload").notNull().default("{}"),
    status: text("status").notNull().default("pending"), // pending | dispatched | failed
    locale: text("locale").notNull().default("en"),
    attempts: integer("attempts").notNull().default(0),
    failureCode: text("failure_code"),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    providerMessageId: text("provider_message_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("notification_events_user_idx").on(table.userId),
    index("notification_events_status_idx").on(table.status),
  ],
);
