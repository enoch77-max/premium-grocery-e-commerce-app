import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

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
  (table) => [index("products_category_idx").on(table.categorySlug)],
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
  (table) => [unique("cart_items_cart_product_unique").on(table.cartId, table.productId)],
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
  (table) => [index("sessions_user_idx").on(table.userId)],
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
  (table) => [index("orders_user_idx").on(table.userId), index("orders_email_idx").on(table.email)],
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
