export type Category = {
  slug: string;
  name: string;
  tagline: string;
  emoji: string;
  imageUrl: string;
  accent: string;
  sortOrder: number;
};

export type Product = {
  id: number;
  slug: string;
  name: string;
  brand: string;
  categorySlug: string;
  unit: string;
  priceCents: number;
  compareAtCents: number | null;
  imageUrl: string;
  description: string;
  tags: string[];
  highlights: string[];
  rating: number;
  reviewCount: number;
  stock: number;
  badge: string | null;
  isOrganic: boolean;
  isVegan: boolean;
  isBestseller: boolean;
  isNew: boolean;
  popularity: number;
  origin: string;
  storage: string;
};

export type Offer = {
  slug: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  ctaLabel: string;
  href: string;
  theme: string;
  badge: string;
  emoji: string;
  imageUrl: string | null;
  sortOrder: number;
};

export type Bundle = {
  slug: string;
  title: string;
  subtitle: string;
  itemSlugs: string[];
  priceCents: number;
  compareAtCents: number;
  badge: string;
  theme: string;
  emoji: string;
  imageUrl: string;
  sortOrder: number;
  products?: Product[];
};

export type Coupon = {
  code: string;
  description: string;
  kind: string;
  percentOff: number | null;
  valueCents: number | null;
  minSubtotalCents: number;
};

export type CartLine = {
  id: number;
  productId: number;
  slug: string;
  name: string;
  brand: string;
  unit: string;
  imageUrl: string;
  priceCents: number;
  compareAtCents: number | null;
  quantity: number;
  stock: number;
  categorySlug: string;
  lineTotalCents: number;
  lineSavingsCents: number;
};

export type CartUpsell = {
  product: Product;
  reason: string;
};

export type AppliedCoupon = {
  code: string;
  description: string;
  discountCents: number;
  label: string;
};

export type CartState = {
  lines: CartLine[];
  itemCount: number;
  distinctCount: number;
  subtotalCents: number;
  savingsCents: number;
  discountCents: number;
  deliveryCents: number;
  totalCents: number;
  compareTotalCents: number;
  coupon: AppliedCoupon | null;
  couponError: string | null;
  freeDeliveryThresholdCents: number;
  freeDeliveryRemainingCents: number;
  upsells: CartUpsell[];
};

export type SearchSuggestion = {
  type: "product" | "category" | "query";
  label: string;
  href: string;
  meta?: string;
  emoji?: string;
  imageUrl?: string;
};

export type SearchIntent = {
  cleanQuery: string;
  corrected?: string;
  filters: string[];
  resultLabel: string;
};

export type SearchResponse = {
  query: string;
  intent: SearchIntent;
  products: Product[];
  suggestions: SearchSuggestion[];
  total: number;
  trending: string[];
};
