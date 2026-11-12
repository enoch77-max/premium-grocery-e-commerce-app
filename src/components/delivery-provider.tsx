"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { DEFAULT_DELIVERY_AREA, SERVICE_AREAS, findDeliveryArea, type DeliveryArea } from "@/lib/delivery";
import { CheckIcon, CloseIcon, PinIcon, TruckIcon } from "@/components/icons";

const STORAGE_KEY = "fresco:delivery-area";
const SLOT_KEY = "fresco:delivery-slot";

type DeliveryContextValue = {
  area: DeliveryArea;
  ready: boolean;
  slot: string;
  setSlot: (slotId: string) => void;
  isPickerOpen: boolean;
  openPicker: () => void;
  closePicker: () => void;
  selectArea: (postcode: string) => { ok: boolean; message: string };
};

const DeliveryContext = createContext<DeliveryContextValue | null>(null);

export function DeliveryProvider({ children }: { children: ReactNode }) {
  const [area, setArea] = useState<DeliveryArea>(DEFAULT_DELIVERY_AREA);
  const [slot, setSlotState] = useState("express");
  const [ready, setReady] = useState(false);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      const found = stored ? findDeliveryArea(stored) : null;
      if (found) setArea(found);
      const storedSlot = window.localStorage.getItem(SLOT_KEY);
      if (storedSlot) setSlotState(storedSlot);
    } catch {
      // ignore storage restrictions
    }
    setReady(true);
  }, []);

  const setSlot = useCallback((next: string) => {
    setSlotState(next);
    try {
      window.localStorage.setItem(SLOT_KEY, next);
    } catch {
      // ignore storage restrictions
    }
  }, []);

  const closePicker = useCallback(() => {
    setIsPickerOpen(false);
    setError(null);
  }, []);

  const selectArea = useCallback((postcode: string) => {
    const found = findDeliveryArea(postcode);
    if (!found) {
      setError(`We don't deliver to ${postcode.trim() || "that postcode"} yet — try one of the areas below.`);
      return { ok: false, message: "Postcode outside our delivery zone" };
    }
    setArea(found);
    setError(null);
    try {
      window.localStorage.setItem(STORAGE_KEY, found.postcode);
    } catch {
      // ignore storage restrictions
    }
    setIsPickerOpen(false);
    return { ok: true, message: `Delivering to ${found.neighbourhood}, ${found.postcode}` };
  }, []);

  useEffect(() => {
    if (!isPickerOpen) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closePicker();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = original;
      window.removeEventListener("keydown", onKey);
    };
  }, [isPickerOpen, closePicker]);

  const value = useMemo<DeliveryContextValue>(
    () => ({
      area,
      ready,
      slot,
      setSlot,
      isPickerOpen,
      openPicker: () => setIsPickerOpen(true),
      closePicker,
      selectArea,
    }),
    [area, closePicker, isPickerOpen, ready, selectArea, setSlot, slot],
  );

  return (
    <DeliveryContext.Provider value={value}>
      {children}
      {isPickerOpen ? (
        <DeliveryPicker
          error={error}
          setError={setError}
          onSelect={selectArea}
          onClose={closePicker}
          current={area}
        />
      ) : null}
    </DeliveryContext.Provider>
  );
}

export function useDelivery() {
  const context = useContext(DeliveryContext);
  if (!context) throw new Error("useDelivery must be used inside DeliveryProvider");
  return context;
}

function DeliveryPicker({
  current,
  onSelect,
  onClose,
  error,
  setError,
}: {
  current: DeliveryArea;
  onSelect: (postcode: string) => { ok: boolean; message: string };
  onClose: () => void;
  error: string | null;
  setError: (value: string | null) => void;
}) {
  const [postcode, setPostcode] = useState(current.postcode);

  return (
    <div
      className="fixed inset-0 z-[92] flex items-end justify-center sm:items-start sm:px-4 sm:pt-[10vh]"
      role="dialog"
      aria-modal="true"
      aria-label="Choose your delivery area"
    >
      <button
        type="button"
        aria-label="Close delivery area picker"
        className="absolute inset-0 bg-ink/45 backdrop-blur-[2px]"
        onClick={onClose}
      />
      {/* Rises from the bottom edge on phones so the postcode field and the
          neighbourhood list both sit inside thumb reach. */}
      <div className="animate-sheet-up relative max-h-[92dvh] w-full overflow-hidden rounded-t-[26px] border border-line bg-cream shadow-lift sm:animate-scale-in sm:max-h-none sm:max-w-md sm:rounded-[24px]">
        <div className="flex items-start justify-between gap-3 border-b border-line/70 bg-white px-4 pb-3 pt-2.5 sm:px-5 sm:pt-4">
          <span
            className="absolute left-1/2 top-1.5 h-1 w-10 -translate-x-1/2 rounded-full bg-line sm:hidden"
            aria-hidden
          />
          <div className="min-w-0 pt-1.5 sm:pt-0">
            <h2 className="font-display text-[19px] font-semibold leading-tight tracking-tight sm:text-[22px] sm:leading-none">
              Choose your delivery area
            </h2>
            <p className="mt-1 text-[11px] text-ink-soft">
              Availability and slots update with your postcode.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="press tap-xl -mr-1.5 grid shrink-0 place-items-center rounded-full bg-cream text-ink hover:bg-cream-deep"
            aria-label="Close"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>

        <div className="sheet-scroll max-h-[calc(92dvh-72px)] overflow-y-auto px-4 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] sm:max-h-none sm:px-5 sm:pb-4">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              onSelect(postcode);
            }}
            className="flex gap-2"
          >
            <input
              value={postcode}
              onChange={(event) => {
                setPostcode(event.target.value);
                setError(null);
              }}
              inputMode="numeric"
              autoFocus
              placeholder="Enter postcode"
              aria-label="Delivery postcode"
              enterKeyHint="search"
              className={`h-11 min-w-0 flex-1 rounded-xl border bg-white px-3 text-[14px] font-semibold outline-none transition sm:h-10 sm:text-[13px] ${
                error ? "border-clay/60" : "border-line focus:border-brand"
              }`}
            />
            <button
              type="submit"
              className="press h-11 shrink-0 rounded-xl bg-ink px-5 text-[13px] font-bold text-cream hover:bg-brand-deep sm:h-10 sm:px-4 sm:text-[12px]"
            >
              Check
            </button>
          </form>
          {error ? <p className="mt-1.5 text-[11px] font-semibold text-clay">{error}</p> : null}

          <p className="mt-4 mb-2 flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.14em] text-ink-soft">
            <PinIcon className="h-3.5 w-3.5 text-brand" /> We deliver to {SERVICE_AREAS.length} neighbourhoods
          </p>
          <div className="space-y-1.5 pr-0 sm:max-h-[46vh] sm:overflow-y-auto sm:pr-1">
            {SERVICE_AREAS.map((area) => {
              const active = area.postcode === current.postcode;
              return (
                <button
                  key={area.postcode}
                  type="button"
                  onClick={() => onSelect(area.postcode)}
                  className={`press flex min-h-[56px] w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition sm:min-h-0 ${
                    active ? "border-brand bg-brand-soft/60" : "border-line bg-white hover:border-brand/40"
                  }`}
                >
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-cream text-[13px] font-extrabold text-brand-deep">
                    {area.postcode.slice(-2)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12.5px] font-bold text-ink">
                      {area.neighbourhood}, {area.city}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10.5px] text-ink-soft">
                      <TruckIcon className="h-3 w-3" /> {area.eta} · {area.slots.length} slots today
                    </span>
                  </span>
                  {active ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-brand px-2 py-0.5 text-[9.5px] font-bold text-white">
                      <CheckIcon className="h-2.5 w-2.5" strokeWidth={3} /> Current
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold text-ink-soft">Select</span>
                  )}
                </button>
              );
            })}
          </div>
          <p className="mt-3 rounded-xl bg-cream-deep/60 px-3 py-2 text-[10.5px] leading-relaxed text-ink-soft">
            Delivery is free over $35 in every area. Postcode changes apply to new orders and prefill your
            checkout.
          </p>
        </div>
      </div>
    </div>
  );
}
