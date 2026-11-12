/**
 * Role/permission map. Kept free of any server imports so client components can
 * check what a role may see without pulling in cookies/db.
 */
export const ADMIN_ROLES = ["admin", "staff", "manager", "stock_manager", "seller"] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

export type AdminPermission =
  | "recurring.demand"
  | "recurring.settings"
  | "recurring.allocate"
  | "audit.view";

const PERMISSIONS: Record<AdminPermission, string[]> = {
  "recurring.demand": ["admin", "manager", "stock_manager", "seller"],
  "recurring.settings": ["admin", "manager"],
  "recurring.allocate": ["admin", "manager", "stock_manager"],
  "audit.view": ["admin", "manager", "stock_manager"],
};

/** `staff` remains a legacy alias of `manager`. */
export function roleHasPermission(role: string, permission: AdminPermission) {
  const effective = role === "staff" ? "manager" : role;
  return PERMISSIONS[permission].includes(effective);
}
