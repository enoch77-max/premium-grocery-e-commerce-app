import type { Bundle, Category, Coupon, Offer, Product } from "@/lib/types";

/** Pexels square crop helper — keeps product tiles crisp and consistent. */
const px = (id: number, w = 720, h = 720) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=${w}&h=${h}`;

type SeedProduct = Omit<Product, "id" | "isOrganic" | "isVegan" | "isBestseller" | "isNew"> & {
  isOrganic?: boolean;
  isVegan?: boolean;
  isBestseller?: boolean;
  isNew?: boolean;
};

export const seedOffers: Offer[] = [
  {
    slug: "fresh-week-drop",
    eyebrow: "Fresh week",
    title: "The big fresh produce drop",
    subtitle: "Hand-picked fruit & veg at their seasonal best, with new deals every morning.",
    ctaLabel: "Shop the produce drop",
    href: "/category/fresh-produce",
    theme: "emerald",
    badge: "Up to 40% off",
    emoji: "🥬",
    imageUrl: px(40581877, 900, 700),
    sortOrder: 1,
  },
  {
    slug: "bakery-bogo",
    eyebrow: "Bakery · buy one get one",
    title: "Two loaves. One price.",
    subtitle: "Warm sourdough, butter croissants and buns straight from the 4am bake.",
    ctaLabel: "Fill your bread basket",
    href: "/category/bakery",
    theme: "amber",
    badge: "BOGO free",
    emoji: "🥖",
    imageUrl: px(7541727, 900, 700),
    sortOrder: 2,
  },
  {
    slug: "first-order-gift",
    eyebrow: "New here? Welcome gift",
    title: "$10 off your first $60",
    subtitle: "Use code FRESH10 at checkout — it stacks with free delivery over $35.",
    ctaLabel: "Claim your welcome gift",
    href: "/offers#coupons",
    theme: "rose",
    badge: "Code FRESH10",
    emoji: "🎁",
    imageUrl: px(4451837, 900, 700),
    sortOrder: 3,
  },
  {
    slug: "pantry-stock-up",
    eyebrow: "Pantry stock-up",
    title: "Buy 2, save 20%",
    subtitle: "Rice, pasta, oil and coffee — the essentials that earn their shelf space.",
    ctaLabel: "Build your pantry",
    href: "/category/pantry",
    theme: "indigo",
    badge: "Mix & match",
    emoji: "🫙",
    imageUrl: px(31275834, 900, 700),
    sortOrder: 4,
  },
  {
    slug: "thirty-minute-delivery",
    eyebrow: "Free delivery, today",
    title: "Groceries in 30 minutes",
    subtitle: "Order by 9pm. Free delivery on baskets over $35 — no code, no catch.",
    ctaLabel: "See today's delivery slots",
    href: "/offers#delivery",
    theme: "forest",
    badge: "30-min delivery",
    emoji: "🛵",
    imageUrl: px(18121638, 900, 700),
    sortOrder: 5,
  },
];
