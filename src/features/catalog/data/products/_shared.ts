import type { Product } from "@/lib/types";

/** Pexels square crop helper — keeps product tiles crisp and consistent. */
export const px = (id: number, w = 720, h = 720) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=${w}&h=${h}`;

export type SeedProduct = Omit<Product, "id" | "isOrganic" | "isVegan" | "isBestseller" | "isNew"> & {
  isOrganic?: boolean;
  isVegan?: boolean;
  isBestseller?: boolean;
  isNew?: boolean;
};
