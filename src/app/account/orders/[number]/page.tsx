"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { AccountGate, AccountShell } from "@/components/account-shell";
import { OrderDetail } from "@/features/account/orders/order-detail";
import { useAccountOrders } from "@/components/account/data";
import { formatDeliverySlot, formatMoney, plural } from "@/lib/format";
import { ORDER_STATUS_FLOW, ORDER_STATUS_LABELS, orderStatusIndex } from "@/lib/order-types";
import { useSession } from "@/components/session-provider";
import { useCart } from "@/components/cart-provider";
import {
  ArrowRightIcon,
  CheckIcon,
  ClockIcon,
  CloseIcon,
  LeafIcon,
  PinIcon,
  RefreshIcon,
  ShieldIcon,
  TruckIcon,
} from "@/components/icons";

export default function AccountOrderPage() {
  return (
    <AccountGate>
      <AccountShell>
        <OrderDetail />
      </AccountShell>
    </AccountGate>
  );
}
