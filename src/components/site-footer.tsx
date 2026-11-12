import Link from "next/link";
import { getCategories } from "@/lib/store";
import { ArrowRightIcon, LeafIcon, ShieldIcon, TruckIcon } from "@/components/icons";

export async function SiteFooter() {
  const categories = await getCategories();

  return (
    <footer id="help" className="mt-12 border-t border-line/80 bg-brand-deep text-cream sm:mt-16">
      <div className="safe-b mx-auto max-w-[1340px] 2xl:max-w-[1600px] px-4 pt-10 pb-8 sm:px-6 sm:py-12">
        <div className="grid gap-8 sm:gap-10 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
          <div>
            <div className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-[13px] bg-lime text-brand-deep">
                <LeafIcon className="h-5 w-5" strokeWidth={2} />
              </span>
              <span className="font-display text-[26px] font-semibold tracking-[-0.03em] text-cream">
                fresco
              </span>
            </div>
            <p className="mt-3 max-w-xs text-[12.5px] leading-relaxed text-cream/75">
              A neighbourhood green grocer, online. Farm-fresh produce, real bread and everyday essentials
              delivered in 30 minutes — priced honestly, every day.
            </p>
            <div className="mt-5 space-y-2 text-[11.5px] text-cream/80">
              <p className="inline-flex items-center gap-2">
                <TruckIcon className="h-4 w-4 text-lime" /> Free delivery over $35 · 7 days a week
              </p>
              <p className="inline-flex items-center gap-2">
                <ShieldIcon className="h-4 w-4 text-lime" /> Freshness guaranteed or refunded
              </p>
            </div>
            <div className="mt-5 flex flex-wrap gap-1.5">
              {["Visa", "Mastercard", "Amex", "Apple Pay", "PayPal"].map((method) => (
                <span
                  key={method}
                  className="rounded-md border border-cream/15 bg-white/5 px-2 py-1 text-[10px] font-semibold text-cream/70"
                >
                  {method}
                </span>
              ))}
            </div>
          </div>

          {/* Two-up link columns on a phone; `lg:contents` dissolves the wrapper
              so the desktop four-column grid still owns these children. */}
          <div className="grid grid-cols-2 gap-x-5 gap-y-8 sm:gap-x-8 lg:contents">
            <div>
              <h3 className="text-[11px] font-bold uppercase tracking-[0.16em] text-lime">Shop aisles</h3>
              <ul className="mt-3 space-y-1 text-[13px] text-cream/80 sm:space-y-2 sm:text-[12.5px] [&_a]:inline-flex [&_a]:min-h-[34px] [&_a]:items-center sm:[&_a]:min-h-0">
                {categories.slice(0, 6).map((category) => (
                  <li key={category.slug}>
                    <Link href={`/category/${category.slug}`} className="transition hover:text-lime">
                      {category.name}
                    </Link>
                  </li>
                ))}
                <li>
                  <Link href="/offers" className="font-semibold text-cream transition hover:text-lime">
                    Offers & bundles
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-[11px] font-bold uppercase tracking-[0.16em] text-lime">Helpful</h3>
              <ul className="mt-3 space-y-1 text-[13px] text-cream/80 sm:space-y-2 sm:text-[12.5px] [&_a]:inline-flex [&_a]:min-h-[34px] [&_a]:items-center sm:[&_a]:min-h-0">
                <li>
                  <Link href="/track" className="font-semibold text-cream transition hover:text-lime">
                    Track your order
                  </Link>
                </li>
                <li>
                  <Link href="/account/orders" className="transition hover:text-lime">
                    Your orders & reordering
                  </Link>
                </li>
                <li>
                  <Link href="/login" className="transition hover:text-lime">
                    Sign in or create account
                  </Link>
                </li>
                <li>
                  <Link href="/offers#delivery" className="transition hover:text-lime">
                    Delivery slots & areas
                  </Link>
                </li>
                <li>
                  <Link href="/offers#coupons" className="transition hover:text-lime">
                    Coupons & welcome gift
                  </Link>
                </li>
                <li>
                  <Link href="/offers#bundles" className="transition hover:text-lime">
                    Bundles that save more
                  </Link>
                </li>
                <li>
                  <Link href="/search?q=organic" className="transition hover:text-lime">
                    Organic shop
                  </Link>
                </li>
                <li>
                  <Link href="/search?q=breakfast+under+%2410" className="transition hover:text-lime">
                    Breakfast under $10
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="rounded-2xl border border-cream/15 bg-white/5 p-5">
            <h3 className="font-display text-xl font-semibold text-cream">First order? Take $10 off.</h3>
            <p className="mt-1.5 text-[12px] leading-relaxed text-cream/75">
              Join 12,000+ local households shopping smarter. Use code{" "}
              <span className="rounded bg-lime px-1.5 py-0.5 text-[11px] font-extrabold text-brand-deep">
                FRESH10
              </span>{" "}
              on baskets over $60.
            </p>
            <Link
              href="/offers"
              className="press mt-4 inline-flex items-center gap-2 rounded-full bg-lime px-4 py-2.5 text-[12px] font-bold text-brand-deep hover:bg-cream"
            >
              Claim the welcome gift <ArrowRightIcon className="h-3.5 w-3.5" />
            </Link>
            <p className="mt-3 text-[10px] text-cream/50">
              Demo storefront. No real payments are processed; orders are saved for preview purposes.
            </p>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-4 border-t border-cream/10 pt-5 text-[11.5px] text-cream/55 sm:mt-10 sm:flex-row sm:items-center sm:justify-between sm:text-[11px]">
          <p>© {new Date().getFullYear()} Fresco Green Grocer. Thoughtfully sourced, quickly delivered.</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 [&_a]:inline-flex [&_a]:min-h-[36px] [&_a]:items-center sm:flex sm:flex-wrap sm:gap-4 sm:[&_a]:min-h-0">
            <Link href="/info/privacy" className="transition hover:text-lime">
              Privacy
            </Link>
            <Link href="/info/terms" className="transition hover:text-lime">
              Terms
            </Link>
            <Link href="/info/accessibility" className="transition hover:text-lime">
              Accessibility
            </Link>
            <Link href="/info/modern-slavery" className="transition hover:text-lime">
              Modern slavery statement
            </Link>
            <Link href="/info/contact" className="transition hover:text-lime">
              Contact us
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
