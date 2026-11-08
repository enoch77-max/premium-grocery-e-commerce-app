import type { Category, Product, SearchIntent, SearchResponse, SearchSuggestion } from "@/lib/types";
import { trendingSearches } from "@/lib/catalog-data";

const STOP_WORDS = new Set([
  "a", "an", "the", "for", "with", "and", "or", "of", "to", "in", "on", "my", "me", "some", "please",
  "i", "want", "need", "buy", "get", "find", "looking", "something", "anything", "have", "has", "do",
  "you", "your", "can", "could", "would", "is", "are", "it", "that", "this", "at", "from", "any",
]);

const SYNONYMS: Record<string, string[]> = {
  milk: ["dairy", "semi-skimmed", "whole milk", "oat milk", "milk"],
  bread: ["bakery", "loaf", "sourdough", "baguette", "bread"],
  loaves: ["bread", "bakery"],
  eggs: ["egg", "free-range", "dairy"],
  egg: ["eggs", "free-range", "dairy"],
  cheese: ["cheddar", "dairy"],
  cheddar: ["cheese", "dairy"],
  yogurt: ["yoghurt", "dairy", "greek"],
  yoghurt: ["yogurt", "dairy"],
  butter: ["dairy", "baking"],
  chicken: ["meat", "poultry", "protein"],
  salmon: ["seafood", "fish", "protein"],
  fish: ["seafood", "salmon"],
  meat: ["chicken", "salmon", "butcher"],
  veg: ["vegetables", "produce", "greens"],
  veggies: ["vegetables", "produce", "greens"],
  vegetable: ["vegetables", "produce"],
  vegetables: ["produce", "greens", "carrots", "spinach", "onions", "peppers"],
  fruit: ["produce", "berries", "banana", "strawberries", "avocado"],
  fruits: ["fruit", "produce", "berries"],
  berries: ["strawberries", "fruit"],
  avocado: ["avocados", "produce"],
  avocados: ["avocado", "produce"],
  tomato: ["tomatoes", "produce"],
  tomatoes: ["tomato", "produce", "cherry tomatoes"],
  potato: ["potatoes", "produce"],
  onion: ["onions", "produce"],
  onions: ["onion", "produce"],
  carrot: ["carrots", "produce"],
  carrots: ["carrot", "produce"],
  spinach: ["greens", "salad", "produce"],
  banana: ["bananas", "fruit"],
  bananas: ["banana", "fruit"],
  strawberry: ["strawberries", "berries", "fruit"],
  strawberries: ["strawberry", "berries", "fruit"],
  coffee: ["beans", "roasted", "barista", "espresso"],
  beans: ["coffee", "pantry"],
  juice: ["orange juice", "drinks", "beverages"],
  orange: ["orange juice", "juice", "citrus"],
  drinks: ["beverages", "juice", "water"],
  water: ["still", "sparkling", "beverages"],
  soda: ["sparkling", "drinks"],
  pasta: ["penne", "italian", "dinner"],
  rice: ["basmati", "pantry"],
  oil: ["olive oil", "pantry"],
  flour: ["baking", "mill"],
  chocolate: ["cocoa", "snacks", "dessert"],
  nuts: ["almonds", "snacks", "protein"],
  almonds: ["nuts", "snacks"],
  snack: ["snacks", "nuts", "chocolate", "fruit"],
  snacks: ["snack", "nuts", "chocolate"],
  soap: ["cleaning", "household", "dish soap"],
  cleaning: ["household", "soap", "laundry"],
  laundry: ["household", "detergent", "cleaning"],
  soapy: ["soap", "cleaning"],
  eco: ["organic", "household"],
  breakfast: ["milk", "eggs", "bread", "coffee", "juice", "yogurt", "banana", "strawberries", "croissant"],
  brunch: ["breakfast", "croissant", "salmon", "eggs", "coffee", "juice"],
  lunch: ["salad", "bread", "cheese", "spinach", "tomatoes", "on-the-go"],
  lunchbox: ["kids", "fruit", "snacks", "on-the-go"],
  dinner: ["pasta", "rice", "chicken", "salmon", "onions", "tomatoes", "olive oil", "bread"],
  supper: ["dinner"],
  roast: ["chicken", "carrots", "onions", "butter"],
  bbq: ["grill", "meat", "chicken", "party"],
  grill: ["bbq", "meat", "chicken"],
  party: ["snacks", "drinks", "sparkling", "water", "chocolate", "grill"],
  picnic: ["snacks", "fruit", "drinks", "cheese", "bread"],
  kids: ["banana", "strawberries", "croissant", "juice", "snacks", "fruit", "milk"],
  baking: ["flour", "butter", "eggs", "chocolate"],
  salad: ["spinach", "tomatoes", "avocado", "peppers", "radish"],
  toast: ["bread", "sourdough", "avocado", "butter"],
  smoothie: ["banana", "strawberries", "spinach", "yogurt"],
  protein: ["chicken", "salmon", "eggs", "yogurt", "almonds"],
  healthy: ["salad", "greens", "protein", "fruit", "nuts", "organic"],
  "dairy-free": ["vegan", "oat milk"],
  fridge: ["milk", "yogurt", "butter", "cheese"],
  pantry: ["rice", "pasta", "oil", "coffee", "flour"],
  italian: ["pasta", "olive oil", "penne"],
  plant: ["vegan", "oat milk", "plant-based"],
};

const INTENT_FILTERS: Array<{ match: RegExp; label: string; apply: (product: Product) => boolean }> = [
  { match: /\borganic\b/, label: "Organic", apply: (p) => p.isOrganic || p.tags.includes("organic") },
  { match: /\bvegan\b|\bplant[\s-]?based\b|\bdairy[\s-]?free\b/, label: "Vegan", apply: (p) => p.isVegan },
  {
    match: /\bgluten[\s-]?free\b|\bgf\b/,
    label: "Gluten-free",
    apply: (p) => p.tags.includes("gluten-free"),
  },
  {
    match: /\bdeal\b|\bdeals\b|\bsale\b|\boffer\b|\boffers\b|\bdiscount\b|\bbargain\b|\breduced\b|\bcheap\b/,
    label: "On offer",
    apply: (p) => Boolean(p.compareAtCents && p.compareAtCents > p.priceCents),
  },
  {
    match: /\bbest\s?seller\b|\bbestseller\b|\bpopular\b|\btop\b|\bfavourite\b|\bfavorite\b/,
    label: "Bestsellers",
    apply: (p) => p.isBestseller,
  },
  { match: /\bnew\b|\bnew\b|\bjust\s?in\b/, label: "New in", apply: (p) => p.isNew },
];

const POPULAR_QUERIES = [
  "organic bananas",
  "sourdough bread",
  "whole milk",
  "free range eggs",
  "coffee beans",
  "vegan snacks",
  "breakfast under $10",
  "pasta night bundle",
  "greek yogurt",
  "sparkling water",
  "olive oil",
  "avocado toast",
  "kids lunchbox",
  "dinner for two",
  "mature cheddar",
  "cold pressed juice",
  "almonds",
  "dark chocolate",
  "dish soap",
  "strawberries",
  "chicken breast",
  "salmon fillets",
];

function normalize(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s$]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function singular(word: string) {
  if (word.length < 4) return word;
  if (word.endsWith("ies")) return `${word.slice(0, -3)}y`;
  if (word.endsWith("oes")) return word.slice(0, -2);
  if (word.endsWith("ses")) return word.slice(0, -2);
  if (word.endsWith("s") && !word.endsWith("ss")) return word.slice(0, -1);
  return word;
}

function levenshtein(a: string, b: string) {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > 3) return 99;
  const previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    let last = previous[0];
    previous[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const temp = previous[j];
      previous[j] = Math.min(
        previous[j] + 1,
        previous[j - 1] + 1,
        last + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      last = temp;
    }
  }
  return previous[b.length];
}

function fuzzyLimit(word: string) {
  if (word.length >= 8) return 2;
  if (word.length >= 5) return 2;
  return 1;
}

type IndexedProduct = {
  product: Product;
  name: string;
  nameWords: string[];
  brandWords: string[];
  tagWords: string[];
  categoryWords: string[];
  description: string;
};

function indexProduct(product: Product, categories: Category[]): IndexedProduct {
  const category = categories.find((item) => item.slug === product.categorySlug);
  const name = normalize(product.name);
  return {
    product,
    name,
    nameWords: name.split(" "),
    brandWords: normalize(product.brand).split(" "),
    tagWords: product.tags.flatMap((tag) => normalize(tag).split(" ")),
    categoryWords: normalize(`${category?.name ?? product.categorySlug} ${product.categorySlug}`).split(" "),
    description: normalize(product.description),
  };
}

function expandToken(token: string) {
  const variants = new Set<string>([token, singular(token)]);
  const synonyms = SYNONYMS[token] ?? SYNONYMS[singular(token)];
  synonyms?.forEach((synonym) => {
    variants.add(synonym);
    synonym.split(" ").forEach((part) => variants.add(part));
  });
  return variants;
}

function scoreToken(indexed: IndexedProduct, token: string): number {
  const variants = expandToken(token);
  let best = 0;

  for (const variant of variants) {
    if (!variant) continue;
    if (indexed.name === variant || indexed.nameWords.includes(variant)) best = Math.max(best, 26);
    else if (indexed.name.startsWith(variant)) best = Math.max(best, 20);
    else if (indexed.nameWords.some((word) => word.startsWith(variant) && variant.length >= 3)) best = Math.max(best, 16);
    else if (indexed.name.includes(variant) && variant.length >= 3) best = Math.max(best, 13);

    if (indexed.tagWords.includes(variant)) best = Math.max(best, 15);
    else if (indexed.tagWords.some((word) => word.startsWith(variant) && variant.length >= 3)) best = Math.max(best, 10);

    if (indexed.brandWords.some((word) => word.startsWith(variant))) best = Math.max(best, 8);
    if (indexed.categoryWords.includes(variant) || indexed.categoryWords.some((word) => word.startsWith(variant))) {
      best = Math.max(best, 7);
    }
    if (indexed.description.includes(variant) && variant.length >= 4) best = Math.max(best, 4);
  }

  if (best === 0 && token.length >= 4) {
    const pool = [...indexed.nameWords, ...indexed.tagWords];
    const limit = fuzzyLimit(token);
    for (const word of pool) {
      if (word.length < 3) continue;
      if (levenshtein(token, word) <= limit) {
        best = 9;
        break;
      }
    }
  }

  return best;
}

export function searchCatalog(rawQuery: string, allProducts: Product[], allCategories: Category[]): SearchResponse {
  const original = (rawQuery ?? "").trim();
  const normalized = normalize(original);
  const filters: string[] = [];
  let working = normalized;
  let maxPriceCents: number | null = null;
  let minPriceCents: number | null = null;
  let cheapest = false;

  const underMatch = working.match(/(?:under|below|less than|up to|cheaper than|max|<)\s*\$?\s*(\d+(?:\.\d{1,2})?)/);
  if (underMatch) {
    maxPriceCents = Math.round(Number(underMatch[1]) * 100);
    filters.push(`Under $${underMatch[1]}`);
    working = working.replace(underMatch[0], " ");
  }
  const overMatch = working.match(/(?:over|above|more than|from|>)\s*\$?\s*(\d+(?:\.\d{1,2})?)/);
  if (overMatch) {
    minPriceCents = Math.round(Number(overMatch[1]) * 100);
    filters.push(`$${overMatch[1]}+`);
    working = working.replace(overMatch[0], " ");
  }
  if (/\bcheapest\b|\bcheap\b|\bbudget\b/.test(working)) cheapest = true;

  const activeFilters = INTENT_FILTERS.filter((filter) => filter.match.test(working));
  activeFilters.forEach((filter) => filters.push(filter.label));
  working = working.replace(
    /\borganic\b|\bvegan\b|\bplant[\s-]?based\b|\bdairy[\s-]?free\b|\bgluten[\s-]?free\b|\bgf\b|\bdeal\b|\bdeals\b|\bsale\b|\boffer\b|\boffers\b|\bdiscount\b|\bbargain\b|\breduced\b|\bcheap\b|\bbest\s?seller\b|\bbestseller\b|\bpopular\b|\btop\b|\bfavourite\b|\bfavorite\b|\bjust\s?in\b|\bcheapest\b|\bbudget\b/g,
    " ",
  );

  const rawTokens = working
    .split(" ")
    .map((token) => token.trim())
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token));

  const tokens = Array.from(new Set(rawTokens.map((token) => singular(token)).filter(Boolean)));

  const indexed = allProducts.map((product) => indexProduct(product, allCategories));

  const scored = indexed
    .map((item) => {
      let score = 0;
      let matchedTokens = 0;
      for (const token of tokens) {
        const tokenScore = scoreToken(item, token);
        if (tokenScore > 0) {
          matchedTokens += 1;
          score += tokenScore;
        }
      }

      const product = item.product;
      const passesFilters = activeFilters.every((filter) => filter.apply(product));
      const passesPrice =
        (maxPriceCents === null || product.priceCents <= maxPriceCents) &&
        (minPriceCents === null || product.priceCents >= minPriceCents);

      if (!passesFilters || !passesPrice) return null;
      if (tokens.length > 0 && matchedTokens === 0) return null;
      if (tokens.length > 0 && matchedTokens < Math.min(2, tokens.length) && score < 20) return null;

      score += product.popularity / 40;
      if (item.name.includes(working) && working.length > 3) score += 14;

      return { ...item, score };
    })
    .filter((item): item is IndexedProduct & { score: number } => Boolean(item));

  let corrected: string | undefined;
  if (scored.length === 0 && tokens.length > 0) {
    const vocabulary = new Set<string>();
    indexed.forEach((item) => {
      [...item.nameWords, ...item.tagWords, ...item.brandWords].forEach((word) => {
        if (word.length >= 4) vocabulary.add(word);
      });
    });
    const guesses = tokens.map((token) => {
      let bestWord = token;
      let bestDistance = 99;
      for (const word of vocabulary) {
        const distance = levenshtein(token, word);
        if (distance < bestDistance) {
          bestDistance = distance;
          bestWord = word;
        }
      }
      return bestDistance <= Math.max(2, Math.ceil(token.length / 3)) ? bestWord : token;
    });
    if (guesses.join(" ") !== tokens.join(" ")) corrected = guesses.join(" ");
  }

  const sorted = scored
    .sort((a, b) => {
      if (cheapest) return a.product.priceCents - b.product.priceCents;
      if (b.score !== a.score) return b.score - a.score;
      return b.product.popularity - a.product.popularity;
    })
    .slice(0, 48)
    .map((item) => item.product);

  const suggestions: SearchSuggestion[] = [];
  const categoryHits = new Map<string, number>();
  for (const token of tokens) {
    for (const category of allCategories) {
      const haystack = normalize(`${category.name} ${category.slug}`);
      if (haystack.includes(token) || expandToken(token).has(singular(normalize(category.name).split(" ")[0]))) {
        categoryHits.set(category.slug, (categoryHits.get(category.slug) ?? 0) + 1);
      }
    }
  }
  [...categoryHits.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .forEach(([slug]) => {
      const category = allCategories.find((item) => item.slug === slug);
      if (!category) return;
      suggestions.push({
        type: "category",
        label: `Shop all ${category.name}`,
        href: `/category/${category.slug}`,
        meta: category.tagline,
        emoji: category.emoji,
      });
    });

  const refinements = POPULAR_QUERIES.filter((query) => {
    const normalizedQuery = normalize(query);
    return tokens.some((token) => token.length > 2 && normalizedQuery.includes(token)) &&
      normalizedQuery !== normalized;
  }).slice(0, 3);

  refinements.forEach((query) => {
    suggestions.push({
      type: "query",
      label: query,
      href: `/search?q=${encodeURIComponent(query)}`,
      meta: "Popular search",
    });
  });

  const queryLabel = original || "everything fresh";
  const filterLabel = filters.length ? ` · ${filters.join(" · ")}` : "";
  const intent: SearchIntent = {
    cleanQuery: original,
    corrected,
    filters,
    resultLabel: `${queryLabel}${filterLabel}`,
  };

  return {
    query: original,
    intent,
    products: sorted,
    suggestions: suggestions.slice(0, 5),
    total: sorted.length,
    trending: trendingSearches,
  };
}

export function smartDefaults(allProducts: Product[], categories: Category[]): SearchResponse {
  const products = [...allProducts]
    .sort((a, b) => {
      const aDeal = a.compareAtCents ? 1 : 0;
      const bDeal = b.compareAtCents ? 1 : 0;
      if (bDeal !== aDeal) return bDeal - aDeal;
      return b.popularity - a.popularity;
    })
    .slice(0, 8);

  return {
    query: "",
    intent: { cleanQuery: "", filters: [] as string[], resultLabel: "Trending in your neighbourhood" },
    products,
    suggestions: categories.slice(0, 4).map((category) => ({
      type: "category" as const,
      label: category.name,
      href: `/category/${category.slug}`,
      meta: category.tagline,
      emoji: category.emoji,
    })),
    total: products.length,
    trending: trendingSearches,
  };
}
