"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-4 bg-white rounded-xl shadow-sm border", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-8 sm:space-y-0",
        month: "space-y-6",
        month_caption: "flex justify-center pt-2 relative items-center mb-4",
        caption_label: "text-sm font-bold text-primary tracking-tight",
        nav: "space-x-1 flex items-center",
        button_previous: cn(
          buttonVariants({ variant: "outline" }),
          "h-8 w-8 bg-transparent p-0 opacity-60 hover:opacity-100 absolute left-1 z-10 rounded-full transition-all"
        ),
        button_next: cn(
          buttonVariants({ variant: "outline" }),
          "h-8 w-8 bg-transparent p-0 opacity-60 hover:opacity-100 absolute right-1 z-10 rounded-full transition-all"
        ),
        month_grid: "w-full border-collapse space-y-1.5",
        weekdays: "flex w-full justify-between mb-4 border-b pb-2",
        weekday: "text-muted-foreground rounded-md w-9 font-bold text-[0.7rem] text-center uppercase tracking-widest flex items-center justify-center",
        weeks: "w-full space-y-1.5",
        week: "flex w-full justify-between items-center",
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-normal aria-selected:opacity-100 flex items-center justify-center rounded-lg transition-all text-sm"
        ),
        day_button: "h-9 w-9 p-0 font-normal w-full h-full flex items-center justify-center",
        range_start: "day-range-start rounded-l-lg",
        range_end: "day-range-end rounded-r-lg",
        selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground font-bold shadow-sm",
        today: "bg-accent/20 text-accent font-black ring-1 ring-accent/30",
        outside: "day-outside text-muted-foreground/40 opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground",
        disabled: "text-muted-foreground/30 opacity-30 cursor-not-allowed",
        range_middle: "aria-selected:bg-primary/10 aria-selected:text-primary rounded-none",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: (props) => {
          if (props.orientation === 'left') return <ChevronLeft className="h-5 w-5" />
          return <ChevronRight className="h-5 w-5" />
        }
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }