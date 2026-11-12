"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { CloseIcon } from "@/components/icons";

/**
 * Phone-first sheet. Rises from the bottom with a grab handle, honours the
 * home-indicator inset, can be dragged or tapped away, and locks the page
 * behind it. On wider screens it stays a sheet but narrows to a comfortable
 * column so tablets do not get a full-bleed wall of content.
 */
export function BottomSheet({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  zIndex = "z-[88]",
  dismissOnDrag = true,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  zIndex?: string;
  dismissOnDrag?: boolean;
}) {
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startY = useRef(0);

  useEffect(() => {
    if (!open) {
      setDragY(0);
      setDragging(false);
      return;
    }
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  const onPointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    startY.current = event.clientY;
    setDragging(true);
    (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
  }, []);

  const onPointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!dragging) return;
      const delta = event.clientY - startY.current;
      // Only follow the thumb downwards; pulling up should not stretch the sheet.
      setDragY(delta > 0 ? Math.min(delta, 320) : 0);
    },
    [dragging],
  );

  const endDrag = useCallback(() => {
    setDragging(false);
    if (dragY > 96) onClose();
    setDragY(0);
  }, [dragY, onClose]);

  if (!open) return null;

  return (
    <div
      className={`fixed inset-0 ${zIndex}`}
      role="dialog"
      aria-modal="true"
      aria-label={typeof title === "string" ? title : "Dialog"}
    >
      <button
        type="button"
        aria-label="Close"
        className="animate-fade absolute inset-0 bg-ink/45 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        className="absolute inset-x-0 bottom-0 mx-auto flex max-dvh-92 w-full flex-col overflow-hidden rounded-t-[26px] border-t border-line bg-cream shadow-[0_-24px_60px_-30px_rgba(19,38,29,0.65)] sm:max-w-lg sm:rounded-[26px] sm:border"
        style={{
          transform: dragY ? `translateY(${dragY}px)` : undefined,
          transition: dragging ? "none" : "transform 0.26s cubic-bezier(0.22,1,0.36,1)",
          animation: dragY ? undefined : "sheet-up 0.32s cubic-bezier(0.22,1,0.36,1) both",
        }}
      >
        <div
          className="shrink-0 cursor-grab px-5 pb-1 pt-2.5 active:cursor-grabbing sm:cursor-default"
          onPointerDown={dismissOnDrag ? onPointerDown : undefined}
          onPointerMove={dismissOnDrag ? onPointerMove : undefined}
          onPointerUp={dismissOnDrag ? endDrag : undefined}
          onPointerCancel={dismissOnDrag ? endDrag : undefined}
        >
          <span className="mx-auto block h-1 w-10 rounded-full bg-line sm:hidden" aria-hidden />
        </div>

        {title ? (
          <div className="flex shrink-0 items-start justify-between gap-3 px-5 pb-3 pt-1.5">
            <div className="min-w-0">
              <h2 className="font-display text-[20px] font-semibold leading-tight tracking-tight text-ink">
                {title}
              </h2>
              {subtitle ? (
                <p className="mt-0.5 text-[11.5px] leading-relaxed text-ink-soft">{subtitle}</p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="press tap-xl -mr-1.5 grid shrink-0 place-items-center rounded-full bg-white text-ink hover:bg-cream-deep"
              aria-label="Close"
            >
              <CloseIcon className="h-4 w-4" />
            </button>
          </div>
        ) : null}

        <div className="sheet-scroll min-h-0 flex-1 overflow-y-auto px-5 pb-4">{children}</div>

        {footer ? (
          <div className="safe-b shrink-0 border-t border-line bg-white px-5 pb-4 pt-3">{footer}</div>
        ) : null}
      </div>
    </div>
  );
}
