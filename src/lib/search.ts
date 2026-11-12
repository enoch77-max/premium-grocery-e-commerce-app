import type { Category, Product, SearchIntent, SearchResponse, SearchSuggestion } from "@/lib/types";
import { trendingSearches } from "@/lib/catalog-data";
import { INTENT_FILTERS, POPULAR_QUERIES, STOP_WORDS, SYNONYMS } from "./search/config";

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
  if (Math.abs(a.length - b.length) > 2) return 99;
  const rows = a.length + 1;
  const cols = b.length + 1;
  const d: number[][] = Array.from({ length: rows }, (_, i) => {
    const row = Array<number>(cols).fill(0);
    row[0] = i;
    return row;
  });
  for (let j = 0; j < cols; j += 1) d[0][j] = j;
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      // transposition: "braed" -> "bread" is one typo, not two
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[a.length][b.length];
}

/**
 * Typo tolerance, kept deliberately strict:
 *  - short words (<=6 chars): one edit only, so "breat" can reach "bread" or
 *    "breast" but never an unrelated word like "bean" (distance 2);
 *  - longer words: two edits;
 *  - the first letter and the length must be plausible, because edit distance
 *    alone happily equates words that share almost nothing.
 */
function fuzzyLimit(word: string) {
  return word.length >= 7 ? 2 : 1;
}

function plausibleFuzzyPair(token: string, word: string) {
  if (token[0] !== word[0]) return false;
  return Math.abs(token.length - word.length) <= 1;
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
    else if (indexed.nameWords.some((word) => word.startsWith(variant) && variant.length >= 3))
      best = Math.max(best, 16);
    else if (indexed.name.includes(variant) && variant.length >= 3) best = Math.max(best, 13);

    if (indexed.tagWords.includes(variant)) best = Math.max(best, 15);
    else if (indexed.tagWords.some((word) => word.startsWith(variant) && variant.length >= 3))
      best = Math.max(best, 10);

    if (indexed.brandWords.some((word) => word.startsWith(variant))) best = Math.max(best, 8);
    if (
      indexed.categoryWords.includes(variant) ||
      indexed.categoryWords.some((word) => word.startsWith(variant))
    ) {
      best = Math.max(best, 7);
    }
    if (indexed.description.includes(variant) && variant.length >= 4) best = Math.max(best, 4);
  }

  if (best === 0 && token.length >= 4) {
    const pool = [...indexed.nameWords, ...indexed.tagWords];
    const limit = fuzzyLimit(token);
    for (const word of pool) {
      if (word.length < 4) continue;
      if (!plausibleFuzzyPair(token, word)) continue;
      if (levenshtein(token, word) <= limit) {
        // A typo hit is worth less than any real textual hit, so genuine
        // matches always outrank "sounds like" matches.
        best = 7;
        break;
      }
    }
  }

  return best;
}

export function searchCatalog(
  rawQuery: string,
  allProducts: Product[],
  allCategories: Category[],
): SearchResponse {
  const original = (rawQuery ?? "").trim();
  const normalized = normalize(original);
  const filters: string[] = [];
  let working = normalized;
  let maxPriceCents: number | null = null;
  let minPriceCents: number | null = null;
  let cheapest = false;

  const underMatch = working.match(
    /(?:under|below|less than|up to|cheaper than|max|<)\s*\$?\s*(\d+(?:\.\d{1,2})?)/,
  );
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

  const scoreWith = (tokenList: string[]) =>
    indexed
      .map((item) => {
        let score = 0;
        let matchedTokens = 0;
        for (const token of tokenList) {
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
        if (tokenList.length > 0 && matchedTokens === 0) return null;
        if (tokenList.length > 0 && matchedTokens < Math.min(2, tokenList.length) && score < 20) return null;

        score += product.popularity / 40;
        if (item.name.includes(working) && working.length > 3) score += 14;

        return { ...item, score };
      })
      .filter((item): item is IndexedProduct & { score: number } => Boolean(item));

  let scored = scoreWith(tokens);

  let corrected: string | undefined;
  const bestTextual = scored.reduce((max, item) => Math.max(max, item.score), 0);
  // If nothing scored above typo level, the shopper probably misspelt something.
  const onlyFuzzyHits = scored.length > 0 && bestTextual < 13;
  if ((scored.length === 0 || onlyFuzzyHits) && tokens.length > 0) {
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
      const allowed = token.length >= 7 ? 2 : 1;
      return bestDistance <= allowed && bestWord !== token ? bestWord : token;
    });
    if (guesses.join(" ") !== tokens.join(" ")) corrected = guesses.join(" ");
  }

  // When we detected a misspelling, rank against the corrected terms: a shopper
  // who typed "breat" wants bread products ordered by real relevance, not by
  // whatever popularity tie-break the typo-level hits produced.
  if (corrected) {
    const rescored = scoreWith(corrected.split(" ").filter(Boolean));
    if (rescored.length) scored = rescored;
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
      if (
        haystack.includes(token) ||
        expandToken(token).has(singular(normalize(category.name).split(" ")[0]))
      ) {
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
    return (
      tokens.some((token) => token.length > 2 && normalizedQuery.includes(token)) &&
      normalizedQuery !== normalized
    );
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
