"use client";

import { useState, useRef, useEffect } from "react";

export interface DateRange {
  startDate: string; // ISO "YYYY-MM-DD"
  endDate: string;   // ISO "YYYY-MM-DD"
}

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onChange: (range: DateRange) => void;
  className?: string;
}

export function parseISODate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function formatISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function formatDisplayDateRange(startDate: string, endDate: string): string {
  if (!startDate && !endDate) return "Select travel dates";
  if (startDate && !endDate) {
    const s = parseISODate(startDate);
    const sMonth = s.toLocaleDateString("en-US", { month: "short" });
    return `${sMonth} ${s.getDate()} – Select return`;
  }

  const s = parseISODate(startDate);
  const e = parseISODate(endDate);

  const diffTime = e.getTime() - s.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  const sMonth = s.toLocaleDateString("en-US", { month: "short" });
  const eMonth = e.toLocaleDateString("en-US", { month: "short" });

  const durationStr = diffDays > 0 ? ` (${diffDays} ${diffDays === 1 ? "Day" : "Days"})` : "";

  if (s.getFullYear() !== e.getFullYear()) {
    return `${sMonth} ${s.getDate()}, ${s.getFullYear()} – ${eMonth} ${e.getDate()}, ${e.getFullYear()}${durationStr}`;
  }

  return `${sMonth} ${s.getDate()} – ${eMonth} ${e.getDate()}${durationStr}`;
}

export function calculateQuickChipRange(
  chip: "weekend" | 7 | 10 | 14,
  baseStartDate?: string,
  referenceToday?: Date
): DateRange {
  const today = referenceToday ? new Date(referenceToday) : new Date();
  today.setHours(0, 0, 0, 0);

  if (chip === "weekend") {
    const base = baseStartDate ? parseISODate(baseStartDate) : new Date(today);
    const dayOfWeek = base.getDay(); // 0 = Sun, 5 = Fri, 6 = Sat
    const daysUntilFriday = (5 - dayOfWeek + 7) % 7;
    const start = new Date(base.getFullYear(), base.getMonth(), base.getDate() + (daysUntilFriday === 0 && base < today ? 7 : daysUntilFriday));
    const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 3);
    return {
      startDate: formatISODate(start),
      endDate: formatISODate(end),
    };
  }

  const start = baseStartDate
    ? parseISODate(baseStartDate)
    : new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + chip);
  return {
    startDate: formatISODate(start),
    endDate: formatISODate(end),
  };
}

export function DateRangePicker({
  startDate,
  endDate,
  onChange,
  className = "",
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize month view to startDate or current date
  const [viewMonth, setViewMonth] = useState<Date>(() => {
    if (startDate) {
      const [y, m] = startDate.split("-").map(Number);
      return new Date(y, m - 1, 1);
    }
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });


  // Close on click outside and escape
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setIsOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0 = Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthTitle = viewMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = formatISODate(today);

  const prevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setViewMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const nextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setViewMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleDayClick = (dateStr: string) => {
    if (!startDate || (startDate && endDate)) {
      // Begin new range selection
      onChange({ startDate: dateStr, endDate: "" });
    } else if (startDate && !endDate) {
      if (dateStr < startDate) {
        onChange({ startDate: dateStr, endDate: "" });
      } else {
        onChange({ startDate, endDate: dateStr });
        setIsOpen(false);
      }
    }
  };

  const handleQuickChipClick = (chip: "weekend" | 7 | 10 | 14) => {
    const range = calculateQuickChipRange(chip, startDate);
    onChange(range);
    setIsOpen(false);
  };

  const displayString = formatDisplayDateRange(startDate, endDate);

  return (
    <div className={`relative w-full ${className}`} ref={containerRef}>
      {/* Trigger Surface */}
      <button
        id="quick-dates-trigger"
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-label="Travel Dates"
        className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-surface-container-low hover:bg-surface-container transition-colors group cursor-pointer w-full text-left"
      >
        <span className="material-symbols-outlined text-secondary text-[22px] group-hover:scale-110 transition-transform shrink-0">
          date_range
        </span>
        <div className="flex flex-col w-full min-w-0">
          <span className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider block">
            Travel Dates
          </span>
          <span className="text-on-surface text-xs sm:text-sm font-semibold truncate block">
            {displayString}
          </span>
        </div>
      </button>

      {/* Popover */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="Select travel dates"
          className="absolute top-full left-0 sm:left-auto right-0 sm:right-auto mt-2 w-[calc(100vw-2rem)] sm:w-[360px] max-w-[360px] rounded-2xl bg-surface-container-lowest p-4 shadow-2xl border border-surface-container-high z-50 animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Quick Duration Chips */}
          <div className="flex flex-wrap items-center gap-1.5 pb-3 mb-3 border-b border-surface-container">
            <span className="text-[10px] uppercase font-bold text-outline mr-0.5">Quick:</span>
            <button
              type="button"
              onClick={() => handleQuickChipClick("weekend")}
              className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-surface-container hover:bg-primary-fixed hover:text-on-primary-fixed text-on-surface transition-colors cursor-pointer"
            >
              Weekend (3d)
            </button>
            <button
              type="button"
              onClick={() => handleQuickChipClick(7)}
              className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-surface-container hover:bg-primary-fixed hover:text-on-primary-fixed text-on-surface transition-colors cursor-pointer"
            >
              1 Week (7d)
            </button>
            <button
              type="button"
              onClick={() => handleQuickChipClick(10)}
              className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-surface-container hover:bg-primary-fixed hover:text-on-primary-fixed text-on-surface transition-colors cursor-pointer"
            >
              10 Days
            </button>
            <button
              type="button"
              onClick={() => handleQuickChipClick(14)}
              className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-surface-container hover:bg-primary-fixed hover:text-on-primary-fixed text-on-surface transition-colors cursor-pointer"
            >
              2 Weeks (14d)
            </button>
          </div>

          {/* Month Header */}
          <div className="flex items-center justify-between mb-3 px-1">
            <button
              type="button"
              onClick={prevMonth}
              className="p-1 rounded-full hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
              aria-label="Previous month"
            >
              <span className="material-symbols-outlined text-[20px]">chevron_left</span>
            </button>
            <span className="text-sm font-bold text-on-surface">{monthTitle}</span>
            <button
              type="button"
              onClick={nextMonth}
              className="p-1 rounded-full hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
              aria-label="Next month"
            >
              <span className="material-symbols-outlined text-[20px]">chevron_right</span>
            </button>
          </div>

          {/* Day of Week Labels */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1">
            {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
              <span key={day} className="text-[11px] font-semibold text-on-surface-variant/70 py-1">
                {day}
              </span>
            ))}
          </div>

          {/* Month Calendar Grid */}
          <div className="grid grid-cols-7 gap-y-1 gap-x-0">
            {/* Blank offset cells */}
            {Array.from({ length: firstDayOfWeek }).map((_, idx) => (
              <div key={`blank-${idx}`} className="h-8 w-full" />
            ))}

            {/* Days */}
            {Array.from({ length: daysInMonth }).map((_, idx) => {
              const day = idx + 1;
              const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const isPast = dateStr < todayStr;
              const isStart = startDate === dateStr;
              const isEnd = endDate === dateStr;
              const inRange = Boolean(startDate && endDate && dateStr > startDate && dateStr < endDate);
              const isOnlyStart = isStart && !endDate;
              const isSameStartEnd = isStart && isEnd;

              return (
                <button
                  key={dateStr}
                  type="button"
                  disabled={isPast}
                  onClick={() => handleDayClick(dateStr)}
                  className={`h-8 w-full text-xs font-medium transition-colors cursor-pointer flex items-center justify-center relative
                    ${isPast ? "text-outline/35 cursor-not-allowed" : "hover:bg-surface-container"}
                    ${isSameStartEnd ? "rounded-full bg-primary text-on-primary font-bold shadow-xs z-10" : ""}
                    ${isStart && !isEnd ? "rounded-l-full bg-primary text-on-primary font-bold shadow-xs z-10" : ""}
                    ${isEnd && !isStart ? "rounded-r-full bg-primary text-on-primary font-bold shadow-xs z-10" : ""}
                    ${inRange ? "bg-primary-fixed text-on-primary-fixed rounded-none" : ""}
                    ${!isStart && !isEnd && !inRange && !isPast ? "text-on-surface rounded-full" : ""}
                    ${isOnlyStart ? "rounded-full" : ""}
                  `}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Popover Footer */}
          <div className="flex items-center justify-between pt-3 mt-3 border-t border-surface-container text-xs">
            <button
              type="button"
              onClick={() => onChange({ startDate: "", endDate: "" })}
              className="text-on-surface-variant hover:text-error font-medium transition-colors cursor-pointer px-2 py-1 rounded-lg hover:bg-surface-container"
            >
              Clear
            </button>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-on-surface-variant truncate max-w-[170px]">
                {startDate && endDate ? `${startDate} to ${endDate}` : "Select range"}
              </span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-3 py-1 rounded-xl bg-primary text-on-primary font-semibold hover:bg-primary-container transition-colors cursor-pointer shadow-2xs"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
