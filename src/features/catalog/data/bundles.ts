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

export const seedBundles: Bundle[] = [
  {
    slug: "weekday-breakfast-bundle",
    title: "Weekday Breakfast Bundle",
    subtitle: "Milk, sourdough, eggs, berries and coffee — five mornings, one basket.",
    itemSlugs: [
      "fresh-whole-milk",
      "wild-yeast-sourdough",
      "free-range-eggs",
      "peak-season-strawberries",
      "ember-house-coffee",
    ],
    priceCents: 1799,
    compareAtCents: 2145,
    badge: "Save $3.46",
    theme: "amber",
    emoji: "🍳",
    imageUrl: px(11363573, 800, 800),
    sortOrder: 1,
  },
  {
    slug: "family-pasta-night",
    title: "Family Pasta Night",
    subtitle: "Penne, cherry tomatoes, onions, olive oil and cheddar for the table.",
    itemSlugs: [
      "bronze-cut-penne",
      "sweet-cherry-tomatoes",
      "brown-cooking-onions",
      "extra-virgin-olive-oil",
      "mature-cheddar",
    ],
    priceCents: 1749,
    compareAtCents: 2085,
    badge: "Dinner in 20 min",
    theme: "rose",
    emoji: "🍝",
    imageUrl: px(14545365, 800, 800),
    sortOrder: 2,
  },
  {
    slug: "healthy-desk-box",
    title: "Healthy Desk Box",
    subtitle: "Nuts, fruit pots, dark chocolate and sparkling water for the work week.",
    itemSlugs: [
      "dry-roasted-almonds",
      "fresh-fruit-snack-pots",
      "70-percent-dark-chocolate",
      "sparkling-grapefruit-water",
    ],
    priceCents: 1499,
    compareAtCents: 1796,
    badge: "Save $2.97",
    theme: "emerald",
    emoji: "🥜",
    imageUrl: px(4051132, 800, 800),
    sortOrder: 3,
  },
  {
    slug: "sunday-roast-basket",
    title: "Sunday Roast Basket",
    subtitle: "Free-range chicken, rainbow carrots, onions and churned butter.",
    itemSlugs: [
      "free-range-chicken-breast",
      "rainbow-carrots",
      "brown-cooking-onions",
      "churned-salted-butter",
    ],
    priceCents: 1149,
    compareAtCents: 1346,
    badge: "Weekend favourite",
    theme: "forest",
    emoji: "🍗",
    imageUrl: px(5769375, 800, 800),
    sortOrder: 4,
  },
];
