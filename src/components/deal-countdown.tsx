"use client";

import { useEffect, useState } from "react";
import { ClockIcon } from "@/components/icons";

function remaining() {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  const diff = Math.max(0, end.getTime() - now.getTime());
  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  return { hours, minutes, seconds };
}

export function DealCountdown() {
  const [time, setTime] = useState<{ hours: number; minutes: number; seconds: number } | null>(null);

  useEffect(() => {
    setTime(remaining());
    const timer = setInterval(() => setTime(remaining()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-clay/10 px-2.5 py-1 text-[11px] font-bold text-clay">
      <ClockIcon className="h-3.5 w-3.5" />
      {time ? (
        <span className="tabular-nums">
          Ends in {String(time.hours).padStart(2, "0")}:{String(time.minutes).padStart(2, "0")}:
          {String(time.seconds).padStart(2, "0")}
        </span>
      ) : (
        <span>Ends tonight</span>
      )}
    </span>
  );
}
