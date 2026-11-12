import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowRightIcon, LeafIcon, ShieldIcon, TruckIcon } from "@/components/icons";

type InfoPage = {
  title: string;
  eyebrow: string;
  intro: string;
  sections: Array<{ heading: string; body: string }>;
};

const PAGES: Record<string, InfoPage> = {
  privacy: {
    eyebrow: "Your data",
    title: "Privacy policy",
    intro:
      "We collect the minimum needed to pick, pack and deliver your groceries — and we never sell shopper data.",
    sections: [
      {
        heading: "What we store",
        body: "Your name, email, phone (optional), delivery address and order history. Your basket is linked to an anonymous, httpOnly cookie so it survives a page refresh for up to 60 days.",
      },
      {
        heading: "What we don't store",
        body: "This preview store never processes real payments and never captures card numbers. Payment selection is recorded as a preference only.",
      },
      {
        heading: "Your controls",
        body: "Clear your basket at any time from the basket drawer. Clearing cookies removes the basket link immediately. Order history is retained only to support freshness refunds.",
      },
    ],
  },
  terms: {
    eyebrow: "The small print",
    title: "Terms of service",
    intro: "Plain-language terms for shopping with Fresco.",
    sections: [
      {
        heading: "Prices and offers",
        body: "Prices include tax. Multi-buy savings are shown against our own usual prices and are applied automatically in the basket. One promo code per order; codes can't be combined with another code but do stack with multi-buys and free delivery.",
      },
      {
        heading: "Delivery",
        body: "Delivery is free on baskets over $35, otherwise a flat $3.99. Express slots are subject to driver availability in your postcode. If we miss your chosen slot, delivery is refunded.",
      },
      {
        heading: "Freshness guarantee",
        body: "If an item arrives less than fresh, contact us within 48 hours of delivery and we refund that item — no photos or forms required.",
      },
      {
        heading: "Demo notice",
        body: "This storefront is a working demonstration. Orders are stored so you can revisit your confirmation, but no goods are dispatched and no money changes hands.",
      },
    ],
  },
  accessibility: {
    eyebrow: "For everyone",
    title: "Accessibility statement",
    intro:
      "We build to WCAG 2.2 AA in spirit and practice: keyboard-first navigation, visible focus rings and generous contrast.",
    sections: [
      {
        heading: "Keyboard support",
        body: "Press ⌘K or Ctrl+K (or /) anywhere to open search. Use arrow keys to move through results and Enter to open one. Escape closes search, the basket drawer and every dialog.",
      },
      {
        heading: "Screen readers",
        body: "Interactive controls carry descriptive labels, quantity changes and add-to-basket confirmations are announced politely, and the basket drawer traps focus correctly.",
      },
      {
        heading: "Tell us what to fix",
        body: "If something here is hard to use, tell the team via the contact page and we'll prioritise it before the next release.",
      },
    ],
  },
  "modern-slavery": {
    eyebrow: "Sourcing",
    title: "Modern slavery statement",
    intro:
      "Every supplier we buy from is screened for labour standards before their first delivery and reviewed annually.",
    sections: [
      {
        heading: "Supplier screening",
        body: "Produce, dairy and meat suppliers sign our labour standards code, confirm right-to-work checks and allow unannounced site visits.",
      },
      {
        heading: "Higher-risk categories",
        body: "Cocoa, coffee and seafood are audited against third-party certification. Where a certification gap exists, we fund an independent audit rather than delisting a small producer.",
      },
      {
        heading: "Reporting concerns",
        body: "Anyone in our supply chain can raise a concern anonymously and is protected from retaliation. Concerns are reviewed within five working days.",
      },
    ],
  },
  contact: {
    eyebrow: "Help",
    title: "Contact us",
    intro: "Real humans, seven days a week, 7am–10pm.",
    sections: [
      {
        heading: "Order issues",
        body: "Reply to your order confirmation email with the order number. Missing or less-than-fresh items are refunded within one working day — no photos needed.",
      },
      {
        heading: "Delivery areas",
        body: "We currently deliver to Sunset Park, Park Slope, Brooklyn Heights, Williamsburg, Greenwood and the Lower East Side. Change your area from the picker in the header.",
      },
      {
        heading: "Coupons and bundles",
        body: "One code per order. If a code isn't applying, check the minimum spend shown on the coupon — the code stays saved and applies automatically once you qualify.",
      },
    ],
  },
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const page = PAGES[slug];
  return {
    title: page ? `${page.title} — Fresco` : "Information — Fresco",
    description: page?.intro,
  };
}

export default async function InfoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = PAGES[slug];
  if (!page) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <Link href="/" className="text-[11.5px] font-semibold text-ink-soft hover:text-brand">
        ← Back to the shop
      </Link>
      <p className="mt-4 text-[10.5px] font-extrabold uppercase tracking-[0.16em] text-brand">
        {page.eyebrow}
      </p>
      <h1 className="mt-1.5 font-display text-[32px] font-semibold leading-tight tracking-[-0.02em] sm:text-[40px]">
        {page.title}
      </h1>
      <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">{page.intro}</p>

      <div className="mt-6 space-y-3">
        {page.sections.map((section) => (
          <section key={section.heading} className="rounded-2xl border border-line/80 bg-white p-4 sm:p-5">
            <h2 className="text-[13.5px] font-bold text-ink">{section.heading}</h2>
            <p className="mt-1 text-[12.5px] leading-relaxed text-ink-soft">{section.body}</p>
          </section>
        ))}
      </div>

      <div className="mt-6 grid gap-2 sm:grid-cols-3">
        {[
          { icon: TruckIcon, label: "Free delivery over $35" },
          { icon: ShieldIcon, label: "Refunds in one working day" },
          { icon: LeafIcon, label: "Freshness guaranteed" },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-2 rounded-xl bg-cream-deep/60 px-3 py-2">
            <item.icon className="h-4 w-4 text-brand" />
            <span className="text-[11px] font-semibold text-ink">{item.label}</span>
          </div>
        ))}
      </div>

      <Link
        href="/"
        className="press mt-6 inline-flex items-center gap-2 rounded-full bg-brand px-5 py-3 text-[13px] font-bold text-white hover:bg-brand-deep"
      >
        Continue shopping <ArrowRightIcon className="h-4 w-4" />
      </Link>
    </div>
  );
}
