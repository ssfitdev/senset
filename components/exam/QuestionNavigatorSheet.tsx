"use client";

import { LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

interface QuestionNavigatorSheetProps {
  total: number;
  currentOrder: number;
  answered: Set<number>;
  onJump: (order: number) => void;
}

export function QuestionNavigatorSheet({
  total,
  currentOrder,
  answered,
  onJump,
}: QuestionNavigatorSheetProps) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 gap-1.5 tabular-nums">
          <LayoutGrid className="size-4" />
          {answered.size}/{total}
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="max-h-[75vh]">
        <SheetHeader>
          <SheetTitle>
            {answered.size} of {total} answered
          </SheetTitle>
        </SheetHeader>
        <div className="grid grid-cols-6 gap-2 overflow-y-auto px-4 pb-6 sm:grid-cols-8">
          {Array.from({ length: total }, (_, i) => {
            const isAnswered = answered.has(i);
            const isCurrent = i === currentOrder;
            return (
              <SheetClose asChild key={i}>
                <button
                  type="button"
                  onClick={() => onJump(i)}
                  className={cn(
                    "flex aspect-square items-center justify-center rounded-lg border text-sm font-medium transition-colors",
                    isCurrent && "ring-2 ring-primary ring-offset-2 ring-offset-background",
                    isAnswered
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground",
                  )}
                >
                  {i + 1}
                </button>
              </SheetClose>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}
