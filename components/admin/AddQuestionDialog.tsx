"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

import { authFetch } from "@/lib/firebase/authFetch";
import { questionRowSchema, type QuestionRowInput } from "@/lib/validation/schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const OPTION_FIELDS: { name: "optionA" | "optionB" | "optionC" | "optionD"; label: string }[] = [
  { name: "optionA", label: "Option A" },
  { name: "optionB", label: "Option B" },
  { name: "optionC", label: "Option C" },
  { name: "optionD", label: "Option D" },
];

export function AddQuestionDialog({ onAdded }: { onAdded?: () => void }) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<QuestionRowInput>({
    resolver: zodResolver(questionRowSchema),
    defaultValues: {
      text: "",
      optionA: "",
      optionB: "",
      optionC: "",
      optionD: "",
      correctOption: "A",
      category: "",
    },
  });

  async function onSubmit(values: QuestionRowInput) {
    setSubmitting(true);
    try {
      const res = await authFetch("/api/admin/questions", {
        method: "POST",
        body: JSON.stringify([values]),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Couldn't add the question.");
        return;
      }
      toast.success("Question added.");
      reset();
      setOpen(false);
      onAdded?.();
    } catch {
      toast.error("Couldn't reach the server.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5">
          <Plus className="size-4" /> Add question
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle>Add a question</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex max-h-[70vh] flex-col gap-3 overflow-y-auto">
          <div>
            <Label htmlFor="text">Question text</Label>
            <Input id="text" className="mt-1.5" {...register("text")} />
            {errors.text && <p className="mt-1 text-xs text-destructive">{errors.text.message}</p>}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {OPTION_FIELDS.map(({ name, label }) => (
              <div key={name}>
                <Label htmlFor={name}>{label}</Label>
                <Input id={name} className="mt-1.5" {...register(name)} />
                {errors[name] && (
                  <p className="mt-1 text-xs text-destructive">{errors[name]?.message}</p>
                )}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="correctOption">Correct option</Label>
              <Controller
                control={control}
                name="correctOption"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="correctOption" className="mt-1.5 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["A", "B", "C", "D"].map((o) => (
                        <SelectItem key={o} value={o}>
                          {o}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div>
              <Label htmlFor="category">Category (optional)</Label>
              <Input id="category" className="mt-1.5" {...register("category")} />
            </div>
          </div>

          <DialogFooter className="mt-2">
            <Button type="submit" disabled={submitting} className="w-full gap-1.5">
              {submitting ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              Add question
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
