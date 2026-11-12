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

export const seedCoupons: Coupon[] = [
  {
    code: "FRESH10",
    description: "$10 off baskets over $60",
    kind: "fixed",
    percentOff: null,
    valueCents: 1000,
    minSubtotalCents: 6000,
  },
  {
    code: "SAVE15",
    description: "15% off baskets over $40",
    kind: "percent",
    percentOff: 15,
    valueCents: null,
    minSubtotalCents: 4000,
  },
  {
    code: "FREEDEL",
    description: "Free delivery on baskets over $25",
    kind: "delivery",
    percentOff: null,
    valueCents: null,
    minSubtotalCents: 2500,
  },
];

export const trendingSearches = [
  "organic bananas",
  "sourdough bread",
  "milk",
  "free range eggs",
  "coffee beans",
  "vegan snacks",
  "breakfast under $10",
  "pasta night",
];
