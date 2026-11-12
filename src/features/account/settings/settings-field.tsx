"use client";

export function Field({
  label,
  value,
  onChange,
  type = "text",
  error,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  error?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-[10.5px] font-bold uppercase tracking-[0.1em] text-ink-soft">
        {label}
      </label>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        type={type}
        placeholder={placeholder}
        className={`h-10 w-full rounded-xl border px-3 text-[13px] outline-none transition ${
          error
            ? "border-clay/60 bg-rose-soft/40"
            : "border-line bg-cream/40 focus:border-brand focus:bg-white"
        }`}
      />
      {error ? <p className="mt-0.5 text-[10px] font-semibold text-clay">{error}</p> : null}
    </div>
  );
}
