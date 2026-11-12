"use client";

import Link from "next/link";
import { AccountGate, AccountShell } from "@/components/account-shell";
import { useRecurring } from "@/features/recurring/hooks/use-recurring";
import { ListForm } from "@/features/recurring/ui/list-form";
import { RecurringSkeleton } from "@/features/recurring/ui/primitives";
import { ChevronLeftIcon } from "@/components/icons";

export default function NewRecurringListPage() {
  return (
    <AccountGate>
      <AccountShell>
        <NewList />
      </AccountShell>
    </AccountGate>
  );
}

function NewList() {
  const { data, loading } = useRecurring();

  return (
    <div className="space-y-3">
      <Link
        href="/account/recurring"
        className="press inline-flex items-center gap-1 text-[11.5px] font-bold text-ink-soft hover:text-brand"
      >
        <ChevronLeftIcon className="h-3.5 w-3.5" /> Repeating orders
      </Link>
      <div>
        <h1 className="font-display text-[22px] font-semibold leading-tight tracking-tight">
          New repeating order
        </h1>
        <p className="mt-0.5 text-[11.5px] leading-relaxed text-ink-soft">
          Pick your regulars once. We&apos;ll bring them on the day and time you choose.
        </p>
      </div>

      {loading ? <RecurringSkeleton rows={3} /> : <ListForm mode="create" gateway={data.gateway} />}
    </div>
  );
}
