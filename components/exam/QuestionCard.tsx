"use client";

import { motion, type Variants } from "framer-motion";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { OptionKey } from "@/lib/firestore/schema";

interface QuestionCardProps {
  text: string;
  options: { key: OptionKey; label: string }[];
  selected: OptionKey | null;
  onSelect: (key: OptionKey) => void;
  direction: 1 | -1;
}

const variants: Variants = {
  enter: (direction: 1 | -1) => ({ x: direction > 0 ? 32 : -32, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (direction: 1 | -1) => ({ x: direction > 0 ? -32 : 32, opacity: 0 }),
};

export function QuestionCard({
  text,
  options,
  selected,
  onSelect,
  direction,
}: QuestionCardProps) {
  return (
    <motion.div
      custom={direction}
      variants={variants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col gap-5"
    >
      <h2 className="text-lg leading-snug font-medium text-balance">{text}</h2>
      <div className="flex flex-col gap-2.5">
        {options.map((opt) => {
          const isSelected = selected === opt.key;
          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => onSelect(opt.key)}
              className={cn(
                "flex items-center gap-3 rounded-xl border px-4 py-3.5 text-left text-sm transition-colors active:scale-[0.99]",
                isSelected ? "border-primary bg-accent" : "border-border hover:bg-muted/60",
              )}
            >
              <span
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                  isSelected
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-muted-foreground/30 text-muted-foreground",
                )}
              >
                {isSelected ? <Check className="size-3.5" /> : opt.key}
              </span>
              <span className="flex-1">{opt.label}</span>
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}
