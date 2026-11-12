import type { Product } from "@/lib/types";

/**
 * The visual language of the shop.
 *
 * Every chip, seal and tile on a product is derived from real product data
 * (category, flags, tags, badge) — never decorative fiction. The point is that a
 * shopper understands "fresh", "daily pick", "baked today" in half a second,
 * from an icon and two words, without reading a paragraph.
 */

export type SignalIconId =
  | "sprout"
  | "leaf"
  | "heartleaf"
  | "wheat"
  | "fish"
  | "jar"
  | "milk"
  | "dew"
  | "sparkle"
  | "star"
  | "shield"
  | "sunrise"
  | "snow"
  | "scale";

export type SignalTone = "green" | "amber" | "rose" | "sky" | "ink";

export type Signal = {
  id: string;
  label: string;
  icon: SignalIconId;
  tone: SignalTone;
};

export type CategoryStyle = {
  accent: string;
  soft: string;
  icon: SignalIconId;
  word: string;
  seal: string;
};

export const CATEGORY_STYLES: Record<string, CategoryStyle> = {
  "fresh-produce": {
    accent: "#0f7a4d",
    soft: "#e6f3ea",
    icon: "sprout",
    word: "Produce",
    seal: "Picked fresh",
  },
  bakery: { accent: "#b0761b", soft: "#fdf1d6", icon: "wheat", word: "Bakery", seal: "Baked today" },
  "dairy-eggs": { accent: "#3a6ea8", soft: "#e8f0fa", icon: "milk", word: "Dairy", seal: "Farm fresh" },
  "meat-seafood": { accent: "#bf5a36", soft: "#fde9e4", icon: "fish", word: "Butcher", seal: "Cut today" },
  pantry: { accent: "#7a5c3e", soft: "#f2ecdd", icon: "jar", word: "Pantry", seal: "Stocked weekly" },
  drinks: { accent: "#2a8a8a", soft: "#e2f4f4", icon: "dew", word: "Drinks", seal: "Chilled" },
  snacks: { accent: "#a8487a", soft: "#fbe9f2", icon: "sparkle", word: "Snacks", seal: "Small batch" },
  household: { accent: "#53645a", soft: "#eef1ee", icon: "shield", word: "Home", seal: "Refill friendly" },
};

export const DEFAULT_CATEGORY_STYLE: CategoryStyle = {
  accent: "#0f7a4d",
  soft: "#e6f3ea",
  icon: "leaf",
  word: "Fresco",
  seal: "Fresh",
};

export function categoryStyle(slug: string): CategoryStyle {
  return CATEGORY_STYLES[slug] ?? DEFAULT_CATEGORY_STYLE;
}

function hasTag(product: Product, ...needles: string[]) {
  const haystack = [...product.tags, product.badge ?? "", product.description].join(" ").toLowerCase();
  return needles.some((needle) => haystack.includes(needle));
}

/**
 * Ordered by what a shopper cares about first: provenance of freshness, then
 * diet flags, then social proof. Capped by the caller.
 */
export function productSignals(product: Product): Signal[] {
  const style = categoryStyle(product.categorySlug);
  const signals: Signal[] = [];

  // 1 — freshness story, from the category or an explicit "today" claim
  if (hasTag(product, "baked today", "this morning", "baked at", "warm in")) {
    signals.push({ id: "baked", label: "Baked today", icon: "wheat", tone: "amber" });
  } else if (hasTag(product, "hand-picked", "picked at", "harvested", "hand picked")) {
    signals.push({ id: "picked", label: "Picked at dawn", icon: "sunrise", tone: "green" });
  } else if (product.categorySlug === "fresh-produce") {
    signals.push({ id: "fresh", label: "Picked fresh", icon: "sprout", tone: "green" });
  } else if (product.categorySlug === "meat-seafood") {
    signals.push({ id: "cut", label: "Cut today", icon: "fish", tone: "rose" });
  } else if (product.categorySlug === "dairy-eggs") {
    signals.push({ id: "farm", label: "Farm fresh", icon: "milk", tone: "sky" });
  } else {
    signals.push({ id: "seal", label: style.seal, icon: style.icon, tone: "green" });
  }

  // 2 — health & diet flags
  if (product.isOrganic || hasTag(product, "organic")) {
    signals.push({ id: "organic", label: "Organic", icon: "leaf", tone: "green" });
  }
  if (product.isVegan || hasTag(product, "vegan", "plant-based", "dairy-free")) {
    signals.push({ id: "plant", label: "Plant-powered", icon: "heartleaf", tone: "green" });
  }
  if (hasTag(product, "vitamin", "calcium", "protein", "omega", "fibre", "fiber", "wholegrain")) {
    signals.push({ id: "daily", label: "Daily pick", icon: "heartleaf", tone: "rose" });
  }

  // 3 — social proof & novelty
  if (product.isBestseller || hasTag(product, "bestseller")) {
    signals.push({ id: "loved", label: "Crowd favourite", icon: "star", tone: "amber" });
  }
  if (product.isNew) {
    signals.push({ id: "new", label: "New in", icon: "sparkle", tone: "ink" });
  }

  // de-duplicate the heartleaf pair so a product never shows it twice
  const seen = new Set<string>();
  return signals.filter((signal) => {
    const key = `${signal.icon}-${signal.label}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Turns a storage sentence into a two-word shelf label. */
function keepsLabel(storage: string) {
  const s = storage.toLowerCase();
  if (/fridge|refriger|chill/.test(s)) return "Fridge";
  if (/freez/.test(s)) return "Freezer";
  if (/counter|room temp/.test(s)) return "Cool spot";
  if (/dark/.test(s)) return "Cool & dark";
  if (/dry/.test(s)) return "Cool & dry";
  if (/airtight/.test(s)) return "Airtight";
  return "Shelf stable";
}

/** Short, icon-first facts for the spec strip — replaces paragraphs of copy. */
export function productSpecs(product: Product) {
  const keeps = keepsLabel(product.storage);
  return [
    { id: "origin", icon: "sprout" as SignalIconId, label: "From", value: product.origin.split(",")[0] },
    { id: "keeps", icon: "snow" as SignalIconId, label: "Keeps", value: keeps || "Cool & dry" },
    { id: "size", icon: "scale" as SignalIconId, label: "Size", value: product.unit.split("·")[0].trim() },
    {
      id: "stock",
      icon: product.stock <= 25 ? ("sparkle" as SignalIconId) : ("shield" as SignalIconId),
      label: product.stock <= 25 ? "Hurry" : "Ready",
      value: product.stock <= 25 ? `${product.stock} left` : "In stock",
    },
  ];
}

/** Icons for highlight tiles, chosen by keyword so the icon always means something. */
export function highlightIcon(text: string): SignalIconId {
  const t = text.toLowerCase();
  if (/organic|soil|certified/.test(t)) return "leaf";
  if (/protein|vitamin|calcium|omega|health|daily/.test(t)) return "heartleaf";
  if (/fresh|picked|harvest|ripe|dawn/.test(t)) return "sunrise";
  if (/bake|warm|crust|ferment|loaf/.test(t)) return "wheat";
  if (/save|value|price|budget/.test(t)) return "star";
  if (/recycl|returnable|glass|eco/.test(t)) return "jar";
  if (/chill|cold|fridge|freeze/.test(t)) return "snow";
  return "sprout";
}
