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

export const seedCategories: Category[] = [
  {
    slug: "fresh-produce",
    name: "Fresh Produce",
    tagline: "Harvested within 48 hours",
    emoji: "🥬",
    imageUrl: px(40581877, 600, 600),
    accent: "#0f7a4d",
    sortOrder: 1,
  },
  {
    slug: "dairy-eggs",
    name: "Dairy & Eggs",
    tagline: "Farm fresh, every morning",
    emoji: "🥛",
    imageUrl: px(36183642, 600, 600),
    accent: "#d99b12",
    sortOrder: 2,
  },
  {
    slug: "bakery",
    name: "Bakery",
    tagline: "Baked before sunrise",
    emoji: "🥖",
    imageUrl: px(5436440, 600, 600),
    accent: "#bf5a36",
    sortOrder: 3,
  },
  {
    slug: "meat-seafood",
    name: "Meat & Seafood",
    tagline: "Butcher cut, ice fresh",
    emoji: "🐟",
    imageUrl: px(30648983, 600, 600),
    accent: "#b23b3b",
    sortOrder: 4,
  },
  {
    slug: "pantry",
    name: "Pantry Staples",
    tagline: "Stock the shelves you love",
    emoji: "🫙",
    imageUrl: px(31275834, 600, 600),
    accent: "#8a6a1f",
    sortOrder: 5,
  },
  {
    slug: "snacks",
    name: "Snacks & Nuts",
    tagline: "Better-for-you nibbles",
    emoji: "🍫",
    imageUrl: px(6167332, 600, 600),
    accent: "#9a4b6b",
    sortOrder: 6,
  },
  {
    slug: "beverages",
    name: "Beverages",
    tagline: "Cold-pressed & chilled",
    emoji: "🧃",
    imageUrl: px(9228128, 600, 600),
    accent: "#2f7d90",
    sortOrder: 7,
  },
  {
    slug: "household",
    name: "Household",
    tagline: "Clean home, clear mind",
    emoji: "🧼",
    imageUrl: px(10574054, 600, 600),
    accent: "#5b6ab5",
    sortOrder: 8,
  },
];
