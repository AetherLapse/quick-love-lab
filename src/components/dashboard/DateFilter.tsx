import { useState } from "react";
import { ChevronLeft, ChevronRight, CalendarRange, X } from "lucide-react";
import { DayPicker, type DateRange } from "react-day-picker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { periods, type Period } from "./mockData";
import type { CustomRange } from "@/hooks/useDashboardData";
import { today } from "@/hooks/useDashboardData";

interface DateFilterProps {
  activePeriod: Period;
  setActivePeriod: (p: Period) => void;
  customRange: CustomRange;
  setCustomRange: (r: CustomRange) => void;
}

function toISO(d: Date) {
  return d.toISOString().split("T")[0];
}

function formatDisplay(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

export function DateFilter({ activePeriod, setActivePeriod, customRange, setCustomRange }: DateFilterProps) {
  const [open, setOpen] = useState(false);
  const [selecting, setSelecting] = useState<DateRange | undefined>(
    customRange.start
      ? { from: new Date(customRange.start + "T00:00:00"), to: new Date(customRange.end + "T00:00:00") }
      : undefined
  );

  const handleRangeSelect = (range: DateRange | undefined) => {
    setSelecting(range);
    if (range?.from && range?.to) {
      setCustomRange({ start: toISO(range.from), end: toISO(range.to) });
    } else if (range?.from) {
      setCustomRange({ start: toISO(range.from), end: toISO(range.from) });
    }
  };

  const clearCustom = () => {
    const t = today();
    setSelecting(undefined);
    setCustomRange({ start: t, end: t });
  };

  const hasRange = !!(selecting?.from && selecting?.to &&
    selecting.from.getTime() !== selecting.to.getTime());

  const customLabel = hasRange
    ? `${formatDisplay(toISO(selecting!.from!))} → ${formatDisplay(toISO(selecting!.to!))}`
    : selecting?.from
      ? formatDisplay(toISO(selecting.from))
      : "Custom";

  return (
    <div className="flex flex-wrap gap-1 bg-secondary/50 rounded-xl p-1">
      {periods.filter((p) => p !== "Custom").map((p) => (
        <button
          key={p}
          onClick={() => { setActivePeriod(p); setOpen(false); }}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activePeriod === p
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {p}
        </button>
      ))}

      {/* Custom — popover trigger */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            onClick={() => { setActivePeriod("Custom"); setOpen(true); }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activePeriod === "Custom"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <CalendarRange className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="max-w-[220px] truncate">{customLabel}</span>
          </button>
        </PopoverTrigger>

        <PopoverContent
          align="end"
          sideOffset={8}
          className="w-auto p-0 border border-border bg-card shadow-2xl shadow-black/60 rounded-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-secondary/30">
            <div className="flex items-center gap-2 text-sm">
              <span className={selecting?.from ? "text-foreground font-medium" : "text-muted-foreground"}>
                {selecting?.from ? formatDisplay(toISO(selecting.from)) : "Start date"}
              </span>
              <span className="text-muted-foreground">→</span>
              <span className={hasRange ? "text-foreground font-medium" : "text-muted-foreground"}>
                {hasRange ? formatDisplay(toISO(selecting!.to!)) : "End date"}
              </span>
            </div>
            {selecting?.from && (
              <button
                onClick={clearCustom}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors ml-4"
              >
                <X className="w-3 h-3" /> Clear
              </button>
            )}
          </div>

          {/* Calendar */}
          <div className="p-4">
            <DayPicker
              mode="range"
              selected={selecting}
              onSelect={handleRangeSelect}
              numberOfMonths={2}
              disabled={{ after: new Date() }}
              showOutsideDays={false}
              classNames={{
                months: "flex gap-6",
                month: "space-y-3",
                caption: "flex justify-center relative items-center pt-1 pb-2",
                caption_label: "text-sm font-semibold text-foreground",
                nav: "flex items-center gap-1",
                nav_button:
                  "h-7 w-7 rounded-lg bg-secondary/60 hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors",
                nav_button_previous: "absolute left-0",
                nav_button_next: "absolute right-0",
                table: "w-full border-collapse",
                head_row: "flex mb-1",
                head_cell: "text-muted-foreground w-9 text-center text-[0.75rem] font-medium",
                row: "flex w-full mt-1",
                cell: "w-9 h-9 text-center text-sm p-0 relative [&:has([aria-selected])]:bg-primary/15 first:[&:has([aria-selected])]:rounded-l-lg last:[&:has([aria-selected])]:rounded-r-lg",
                day: "h-9 w-9 rounded-lg font-normal text-sm text-foreground hover:bg-secondary/80 transition-colors flex items-center justify-center cursor-pointer",
                day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground rounded-lg",
                day_range_start: "bg-primary text-primary-foreground rounded-l-lg rounded-r-none",
                day_range_end: "bg-primary text-primary-foreground rounded-r-lg rounded-l-none",
                day_range_middle: "bg-primary/20 text-foreground rounded-none",
                day_today: "font-bold text-primary",
                day_outside: "text-muted-foreground opacity-30 cursor-default",
                day_disabled: "text-muted-foreground opacity-25 cursor-not-allowed hover:bg-transparent",
                day_hidden: "invisible",
              }}
              components={{
                IconLeft: () => <ChevronLeft className="h-4 w-4" />,
                IconRight: () => <ChevronRight className="h-4 w-4" />,
              }}
            />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-secondary/20">
            <span className="text-xs text-muted-foreground">
              {hasRange
                ? `${Math.round((new Date(customRange.end).getTime() - new Date(customRange.start).getTime()) / 86400000) + 1} days selected`
                : "Click a start date, then an end date"}
            </span>
            {hasRange && (
              <button
                onClick={() => setOpen(false)}
                className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity"
              >
                Apply
              </button>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
