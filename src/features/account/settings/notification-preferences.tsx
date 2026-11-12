"use client";

export type NotificationPrefs = {
  email: boolean;
  sms: boolean;
  whatsapp: boolean;
  whatsappNumber: string;
};

/**
 * Customer message preferences. WhatsApp is offered alongside email; the
 * dispatcher tries WhatsApp first when enabled and falls back to email.
 */
export function NotificationPreferences({
  value,
  onChange,
  phone,
}: {
  value: NotificationPrefs;
  onChange: (next: Partial<NotificationPrefs>) => void;
  phone: string;
}) {
  const rows = [
    {
      id: "email" as const,
      title: "Order updates by email",
      note: "Confirmations, shortages, payment nudges — the lot.",
      disabled: false,
    },
    {
      id: "whatsapp" as const,
      title: "Order updates by WhatsApp",
      note: value.whatsappNumber
        ? "Short, friendly messages to your saved number."
        : "Add your WhatsApp number below first.",
      disabled: !value.whatsappNumber,
    },
    {
      id: "sms" as const,
      title: "Driver arrival by SMS",
      note: phone ? "A single text when the driver is outside." : "Add a phone number above to enable texts.",
      disabled: !phone,
    },
  ];

  return (
    <section className="rounded-2xl border border-line/80 bg-white p-4">
      <h2 className="font-display text-[20px] font-semibold tracking-tight">How should we message you?</h2>
      <p className="mt-0.5 text-[11px] leading-relaxed text-ink-soft">
        Saved instantly. If WhatsApp ever fails we&apos;ll fall back to email, so you never miss a delivery.
      </p>

      <label className="mt-3 block">
        <span className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-ink-soft">WhatsApp number</span>
        <input
          value={value.whatsappNumber}
          onChange={(event) => onChange({ whatsappNumber: event.target.value })}
          placeholder="+44 7700 900123"
          inputMode="tel"
          autoComplete="tel"
          className="mt-1 h-11 w-full rounded-xl border border-line bg-cream/40 px-3 text-[15px] outline-none focus:border-brand focus:bg-white sm:text-[13px]"
        />
      </label>

      <div className="mt-2 space-y-2">
        {rows.map((row) => (
          <label
            key={row.id}
            className={`flex items-center gap-3 rounded-xl border border-line/80 px-3 py-2.5 ${
              row.disabled ? "opacity-60" : ""
            }`}
          >
            <input
              type="checkbox"
              checked={value[row.id]}
              disabled={row.disabled}
              onChange={(event) => onChange({ [row.id]: event.target.checked })}
              className="h-4 w-4 accent-[#0f7a4d]"
            />
            <span className="min-w-0 flex-1">
              <span className="block text-[12.5px] font-bold text-ink">{row.title}</span>
              <span className="block text-[10.5px] text-ink-soft">{row.note}</span>
            </span>
          </label>
        ))}
      </div>
    </section>
  );
}
