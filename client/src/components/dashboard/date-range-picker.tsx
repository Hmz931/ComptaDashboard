"use client"

import * as React from "react"
import { CalendarIcon, X } from "lucide-react"
import { addDays, format } from "date-fns"
import { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export function CalendarDateRangePicker({
  className,
  date,
  setDate,
}: {
  className?: string
  date: DateRange | undefined
  setDate: React.Dispatch<React.SetStateAction<DateRange | undefined>>
}) {
  const [isOpen, setIsOpen] = React.useState(false);

  const handleFromChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = new Date(e.target.value);
    if (!isNaN(newDate.getTime())) {
      setDate({ from: newDate, to: date?.to });
    }
  };

  const handleToChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = new Date(e.target.value);
    if (!isNaN(newDate.getTime())) {
      setDate({ from: date?.from, to: newDate });
    }
  };

  const handleReset = () => {
    setDate(undefined);
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Date range summary */}
      {date?.from && date?.to && (
        <div className="p-3 bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg border border-primary/20">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Plage sélectionnée</p>
              <p className="text-sm font-bold text-foreground">
                {format(date.from, "dd MMM yyyy")} → {format(date.to, "dd MMM yyyy")}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Input fields */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Date de début</label>
          <Input
            type="date"
            value={date?.from ? format(date.from, "yyyy-MM-dd") : ""}
            onChange={handleFromChange}
            className="h-9 text-sm font-medium"
            data-testid="input-date-from"
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Date de fin</label>
          <Input
            type="date"
            value={date?.to ? format(date.to, "yyyy-MM-dd") : ""}
            onChange={handleToChange}
            className="h-9 text-sm font-medium"
            data-testid="input-date-to"
          />
        </div>
      </div>

      {/* Calendar picker */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={date?.from && date?.to ? "default" : "outline"}
            size="sm"
            className={cn(
              "w-full justify-start text-left font-medium gap-2 h-9",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="h-4 w-4 flex-shrink-0" />
            {date?.from ? (
              date.to ? (
                <span>{format(date.from, "dd.MM.yy")} - {format(date.to, "dd.MM.yy")}</span>
              ) : (
                <span>{format(date.from, "dd.MM.yy")}</span>
              )
            ) : (
              <span>Choisir une période...</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={(newDate) => {
              setDate(newDate);
              if (newDate?.from && newDate?.to) {
                setIsOpen(false);
              }
            }}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
