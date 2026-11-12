"use client";

import { useMemo, useState } from "react";
import { formatMoney } from "@/lib/format";
import { ProductEditor, type AdminProduct } from "@/features/admin/components/product-editor";
import { NewProductSheet } from "@/features/admin/components/new-product-sheet";


export function ProductManager({ initialProducts }: { initialProducts: AdminProduct[] }) {
  const [items, setItems] = useState(initialProducts);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<AdminProduct | null>(null);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    const list = term
      ? items.filter((item) => `${item.name} ${item.brand} ${item.categorySlug}`.toLowerCase().includes(term))
      : items;
    return list.slice(0, 60);
  }, [items, query]);

  async function save(patch: Partial<AdminProduct> & { id: number }) {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/products", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = (await response.json()) as {
        ok?: boolean;
        error?: string;
        data?: { product: AdminProduct };
      };
      if (!response.ok || !data.ok) throw new Error(data.error ?? "Save failed");
      if (data.data?.product) {
        const saved = data.data.product;
        setItems((prev) => prev.map((item) => (item.id === saved.id ? { ...item, ...saved } : item)));
      }
      setMessage("Saved");
      setEditing(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function create(payload: Record<string, unknown>) {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as {
        ok?: boolean;
        error?: string;
        data?: { product: AdminProduct };
      };
      if (!response.ok || !data.ok) throw new Error(data.error ?? "Could not create product");
      if (data.data?.product) setItems((prev) => [data.data!.product, ...prev]);
      setMessage("Product created and published");
      setCreating(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not create product");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search name, brand or aisle…"
          className="h-11 min-w-0 flex-1 rounded-xl border border-line bg-white px-3 text-[15px] outline-none focus:border-brand sm:h-10 sm:text-[13px]"
          aria-label="Search catalogue"
        />
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="press h-11 shrink-0 rounded-xl bg-ink px-4 text-[12.5px] font-bold text-cream sm:h-10"
        >
          + New
        </button>
      </div>
      {message ? (
        <p className="rounded-xl bg-brand-soft/60 px-3 py-2 text-[12px] font-semibold text-brand-deep">
          {message}
        </p>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-line bg-white">
        <table className="w-full text-left text-[12px]">
          <thead className="bg-cream/70 text-[10px] uppercase tracking-[0.08em] text-ink-soft">
            <tr>
              <th className="px-3 py-2 font-bold">Product</th>
              <th className="hidden px-3 py-2 font-bold sm:table-cell">Price</th>
              <th className="px-3 py-2 font-bold">Stock</th>
              <th className="px-3 py-2 font-bold">Live</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line/70">
            {visible.map((product) => (
              <tr key={product.id} className={product.isActive ? "" : "bg-cream/40"}>
                <td className="px-3 py-2">
                  <p className="font-bold leading-tight">{product.name}</p>
                  <p className="text-[10.5px] text-ink-soft">
                    {product.brand} · {product.categorySlug}
                  </p>
                </td>
                <td className="hidden px-3 py-2 font-semibold sm:table-cell">
                  {formatMoney(product.priceCents)}
                </td>
                <td className="px-3 py-2">
                  <span
                    className={
                      product.stock === 0
                        ? "font-bold text-clay"
                        : product.stock <= 10
                          ? "font-bold text-ink"
                          : "text-ink-soft"
                    }
                  >
                    {product.stock}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void save({ id: product.id, isActive: !product.isActive })}
                    className={`press h-7 w-12 rounded-full text-[10px] font-bold ${
                      product.isActive ? "bg-brand text-white" : "bg-cream-deep text-ink-soft"
                    }`}
                    aria-pressed={product.isActive}
                    aria-label={`${product.isActive ? "Unpublish" : "Publish"} ${product.name}`}
                  >
                    {product.isActive ? "On" : "Off"}
                  </button>
                </td>
                <td className="px-3 py-2 text-right">
                  <button
                    type="button"
                    onClick={() => setEditing(product)}
                    className="press rounded-full border border-line px-3 py-1.5 text-[11px] font-bold text-ink"
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {creating ? (
        <NewProductSheet
          busy={busy}
          onClose={() => setCreating(false)}
          onCreate={(payload) => void create(payload)}
        />
      ) : null}

      {editing ? (
        <ProductEditor
          product={editing}
          busy={busy}
          onClose={() => setEditing(null)}
          onSave={(patch) => void save({ ...patch, id: editing.id })}
        />
      ) : null}
    </div>
  );
}
