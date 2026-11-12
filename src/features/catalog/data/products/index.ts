import { fresh_produce } from "./fresh_produce";
import { dairy_eggs } from "./dairy_eggs";
import { bakery } from "./bakery";
import { meat_seafood } from "./meat_seafood";
import { pantry } from "./pantry";
import { snacks } from "./snacks";
import { beverages } from "./beverages";
import { household } from "./household";
import type { Product } from "@/lib/types";

const rawProducts = [
  ...fresh_produce,
  ...dairy_eggs,
  ...bakery,
  ...meat_seafood,
  ...pantry,
  ...snacks,
  ...beverages,
  ...household,
];

/** The 41 seed products, with flags normalised and ids assigned. */
export const seedProducts: Product[] = rawProducts.map((product, index) => ({
  ...product,
  id: index + 1,
  isOrganic: product.isOrganic ?? false,
  isVegan: product.isVegan ?? false,
  isBestseller: product.isBestseller ?? false,
  isNew: product.isNew ?? false,
}));
