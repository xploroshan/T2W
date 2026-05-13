"use client";

import { useState, useRef, useEffect } from "react";
import { CalendarPlus, ChevronDown, Download } from "lucide-react";
import { googleCalendarUrl, type CalendarRide } from "@/lib/calendar";

interface AddToCalendarProps {
  ride: CalendarRide;
  /** Visual variant — "ghost" suits cards, "primary" suits the detail page. */
  variant?: "ghost" | "primary";
  /** When wrapped in an anchor/Link (e.g., ride card), prevent the surrounding nav. */
  stopPropagation?: boolean;
}

/**
 * Dropdown menu: download .ics or open the Google Calendar deep link.
 * Click-outside closes the menu. Both options are accessible from the
 * keyboard (Enter activates the focused row).
 */
export function AddToCalendar({
  ride,
  variant = "ghost",
  stopPropagation = false,
}: AddToCalendarProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const icsHref = `/api/rides/${ride.id}/ics`;
  const gcalHref = googleCalendarUrl(ride);

  const trigger =
    variant === "primary"
      ? "rounded-lg border border-t2w-accent/40 bg-t2w-accent/10 px-3 py-1.5 text-sm font-medium text-t2w-accent hover:bg-t2w-accent/20"
      : "rounded-md px-2 py-1 text-xs font-medium text-t2w-muted hover:bg-white/10 hover:text-white";

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={(e) => {
          if (stopPropagation) {
            e.preventDefault();
            e.stopPropagation();
          }
          setOpen((v) => !v);
        }}
        aria-haspopup="menu"
        aria-expanded={open}
        data-testid="add-to-calendar"
        className={`inline-flex items-center gap-1.5 ${trigger}`}
      >
        <CalendarPlus className="h-3.5 w-3.5" />
        Add to calendar
        <ChevronDown className="h-3 w-3" />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-20 mt-1 w-52 overflow-hidden rounded-lg border border-t2w-border bg-t2w-surface shadow-lg"
        >
          <a
            role="menuitem"
            href={icsHref}
            download
            onClick={(e) => {
              if (stopPropagation) e.stopPropagation();
              setOpen(false);
            }}
            className="flex items-center gap-2 px-3 py-2 text-sm text-white hover:bg-white/10"
          >
            <Download className="h-3.5 w-3.5" />
            Download .ics
          </a>
          <a
            role="menuitem"
            href={gcalHref}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => {
              if (stopPropagation) e.stopPropagation();
              setOpen(false);
            }}
            className="flex items-center gap-2 px-3 py-2 text-sm text-white hover:bg-white/10"
          >
            <CalendarPlus className="h-3.5 w-3.5" />
            Google Calendar
          </a>
        </div>
      )}
    </div>
  );
}
