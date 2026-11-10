"use client";

import { useMemo, useState } from "react";
import { formatMoney } from "@/lib/format";

type AdminProduct = {
  id: number;
  name: string;
  slug: string;
  brand: string;
  categorySlug: string;
  priceCents: number;
  compareAtCents: number | null;
  stock: number;
  isActive: boolean;
  badge: string | null;
};

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
      const data = (await response.json()) as { ok?: boolean; error?: string; data?: { product: AdminProduct } };
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
      const data = (await response.json()) as { ok?: boolean; error?: string; data?: { product: AdminProduct } };
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
        <p className="rounded-xl bg-brand-soft/60 px-3 py-2 text-[12px] font-semibold text-brand-deep">{message}</p>
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
                  <p className="text-[10.5px] text-ink-soft">{product.brand} · {product.categorySlug}</p>
                </td>
                <td className="hidden px-3 py-2 font-semibold sm:table-cell">{formatMoney(product.priceCents)}</td>
                <td className="px-3 py-2">
                  <span className={product.stock === 0 ? "font-bold text-clay" : product.stock <= 10 ? "font-bold text-ink" : "text-ink-soft"}>
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
        <NewProductSheet busy={busy} onClose={() => setCreating(false)} onCreate={(payload) => void create(payload)} />
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

function ProductEditor({
  product,
  busy,
  onClose,
  onSave,
}: {
  product: AdminProduct;
  busy: boolean;
  onClose: () => void;
  onSave: (patch: Partial<AdminProduct>) => void;
}) {
  const [price, setPrice] = useState((product.priceCents / 100).toFixed(2));
  const [compare, setCompare] = useState(product.compareAtCents ? (product.compareAtCents / 100).toFixed(2) : "");
  const [stock, setStock] = useState(String(product.stock));
  const [badge, setBadge] = useState(product.badge ?? "");

  return (
    <div className="fixed inset-0 z-[95] flex items-end justify-center bg-ink/45 p-0 backdrop-blur-sm sm:items-center sm:p-4" role="dialog" aria-modal="true">
      <div className="animate-sheet-up safe-b w-full max-w-md rounded-t-3xl border border-line bg-cream p-4 sm:animate-scale-in sm:rounded-3xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-brand">Edit product</p>
            <h2 className="font-display text-[20px] font-semibold leading-tight">{product.name}</h2>
          </div>
          <button type="button" onClick={onClose} className="press tap-xl grid place-items-center rounded-full bg-white text-ink" aria-label="Close">✕</button>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <label className="block">
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.1em] text-ink-soft">Price ($)</span>
            <input value={price} onChange={(event) => setPrice(event.target.value)} inputMode="decimal" className="h-11 w-full rounded-xl border border-line bg-white px-3 text-[15px] sm:text-[13px]" />
          </label>
          <label className="block">
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.1em] text-ink-soft">Was ($)</span>
            <input value={compare} onChange={(event) => setCompare(event.target.value)} inputMode="decimal" placeholder="optional" className="h-11 w-full rounded-xl border border-line bg-white px-3 text-[15px] sm:text-[13px]" />
          </label>
          <label className="block">
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.1em] text-ink-soft">Stock</span>
            <input value={stock} onChange={(event) => setStock(event.target.value)} inputMode="numeric" className="h-11 w-full rounded-xl border border-line bg-white px-3 text-[15px] sm:text-[13px]" />
          </label>
          <label className="block">
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.1em] text-ink-soft">Badge</span>
            <input value={badge} onChange={(event) => setBadge(event.target.value)} placeholder="e.g. Bestseller" className="h-11 w-full rounded-xl border border-line bg-white px-3 text-[15px] sm:text-[13px]" />
          </label>
        </div>

        <button
          type="button"
          disabled={busy}
          onClick={() =>
            onSave({
              priceCents: Math.max(1, Math.round(Number(price) * 100) || product.priceCents),
              compareAtCents: compare.trim() ? Math.max(0, Math.round(Number(compare) * 100)) : 0,
              stock: Math.max(0, Number.parseInt(stock, 10) || 0),
              badge,
            })
          }
          className="press mt-3 flex h-12 w-full items-center justify-center rounded-full bg-brand text-[13.5px] font-bold text-white disabled:opacity-60"
        >
          {busy ? "Saving…" : "Save changes"}
        </button>
      </div>
    </div>
  );
}

function NewProductSheet({
  busy,
  onClose,
  onCreate,
}: {
  busy: boolean;
  onClose: () => void;
  onCreate: (payload: Record<string, unknown>) => void;
}) {
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [category, setCategory] = useState("fresh-produce");
  const [unit, setUnit] = useState("each");
  const [price, setPrice] = useState("");
  const [compare, setCompare] = useState("");
  const [stock, setStock] = useState("25");
  const [badge, setBadge] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [description, setDescription] = useState("");

  return (
    <div className="fixed inset-0 z-[95] flex items-end justify-center bg-ink/45 backdrop-blur-sm sm:items-center sm:p-4" role="dialog" aria-modal="true">
      <div className="animate-sheet-up sheet-scroll max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-line bg-cream p-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] sm:animate-scale-in sm:rounded-3xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-brand">Catalogue</p>
            <h2 className="font-display text-[20px] font-semibold leading-tight">Add a product</h2>
          </div>
          <button type="button" onClick={onClose} className="press tap-xl grid place-items-center rounded-full bg-white text-ink" aria-label="Close">✕</button>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <label className="col-span-2 block">
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.1em] text-ink-soft">Name</span>
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Organic Hass Avocados" className="h-11 w-full rounded-xl border border-line bg-white px-3 text-[15px] sm:text-[13px]" />
          </label>
          <label className="block">
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.1em] text-ink-soft">Brand</span>
            <input value={brand} onChange={(event) => setBrand(event.target.value)} placeholder="Fresco" className="h-11 w-full rounded-xl border border-line bg-white px-3 text-[15px] sm:text-[13px]" />
          </label>
          <label className="block">
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.1em] text-ink-soft">Aisle slug</span>
            <select value={category} onChange={(event) => setCategory(event.target.value)} className="h-11 w-full rounded-xl border border-line bg-white px-2 text-[15px] sm:text-[13px]">
              {["fresh-produce", "bakery", "dairy-eggs", "meat-seafood", "pantry", "drinks", "snacks", "household"].map((slug) => (
                <option key={slug} value={slug}>{slug.replace("-", " ")}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.1em] text-ink-soft">Price ($)</span>
            <input value={price} onChange={(event) => setPrice(event.target.value)} inputMode="decimal" placeholder="3.99" className="h-11 w-full rounded-xl border border-line bg-white px-3 text-[15px] sm:text-[13px]" />
          </label>
          <label className="block">
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.1em] text-ink-soft">Was ($)</span>
            <input value={compare} onChange={(event) => setCompare(event.target.value)} inputMode="decimal" placeholder="optional" className="h-11 w-full rounded-xl border border-line bg-white px-3 text-[15px] sm:text-[13px]" />
          </label>
          <label className="block">
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.1em] text-ink-soft">Unit</span>
            <input value={unit} onChange={(event) => setUnit(event.target.value)} placeholder="400g punnet" className="h-11 w-full rounded-xl border border-line bg-white px-3 text-[15px] sm:text-[13px]" />
          </label>
          <label className="block">
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.1em] text-ink-soft">Stock</span>
            <input value={stock} onChange={(event) => setStock(event.target.value)} inputMode="numeric" className="h-11 w-full rounded-xl border border-line bg-white px-3 text-[15px] sm:text-[13px]" />
          </label>
          <label className="block">
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.1em] text-ink-soft">Badge</span>
            <input value={badge} onChange={(event) => setBadge(event.target.value)} placeholder="New in" className="h-11 w-full rounded-xl border border-line bg-white px-3 text-[15px] sm:text-[13px]" />
          </label>
          <label className="col-span-2 block">
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.1em] text-ink-soft">Image URL</span>
            <input value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} placeholder="https://… (defaults to the aisle photo)" className="h-11 w-full rounded-xl border border-line bg-white px-3 text-[15px] sm:text-[13px]" />
          </label>
          <label className="col-span-2 block">
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.1em] text-ink-soft">Description</span>
            <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={2} className="w-full rounded-xl border border-line bg-white px-3 py-2 text-[15px] sm:text-[13px]" />
          </label>
        </div>

        <button
          type="button"
          disabled={busy}
          onClick={() =>
            onCreate({
              name,
              brand,
              categorySlug: category,
              unit,
              priceCents: Math.round(Number(price) * 100),
              compareAtCents: compare.trim() ? Math.round(Number(compare) * 100) : 0,
              stock: Number.parseInt(stock, 10) || 0,
              badge,
              imageUrl,
              description,
            })
          }
          className="press mt-3 flex h-12 w-full items-center justify-center rounded-full bg-brand text-[13.5px] font-bold text-white disabled:opacity-60"
        >
          {busy ? "Creating…" : "Create & publish"}
        </button>
      </div>
    </div>
  );
}
