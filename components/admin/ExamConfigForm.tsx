"use client";

import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";

import { authFetch } from "@/lib/firebase/authFetch";
import { toDatetimeLocalValue } from "@/lib/format";
import { examConfigSchema, type ExamConfigInput } from "@/lib/validation/schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";

const DEFAULTS: ExamConfigInput = {
  startAt: Date.now(),
  endAt: Date.now() + 60 * 60 * 1000,
  durationMinutes: 40,
  questionCount: 50,
  isOpen: false,
  resultsVisibleToStudents: true,
};

export function ExamConfigForm() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ExamConfigInput>({
    resolver: zodResolver(examConfigSchema),
    defaultValues: DEFAULTS,
  });

  useEffect(() => {
    authFetch("/api/admin/exam-config")
      .then(async (res) => {
        const data = await res.json();
        if (res.ok && data.config) {
          reset(data.config);
        }
      })
      .finally(() => setLoading(false));
  }, [reset]);

  async function onSubmit(values: ExamConfigInput) {
    setSaving(true);
    try {
      const res = await authFetch("/api/admin/exam-config", {
        method: "PUT",
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Couldn't save the configuration.");
        return;
      }
      toast.success("Exam configuration saved.");
    } catch {
      toast.error("Couldn't reach the server.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
      <h1 className="text-lg font-semibold">Exam Configuration</h1>

      <div className="grid gap-4 rounded-2xl border bg-card p-5 sm:grid-cols-2">
        <div>
          <Label htmlFor="startAt">Window opens</Label>
          <Controller
            control={control}
            name="startAt"
            render={({ field }) => (
              <Input
                id="startAt"
                type="datetime-local"
                className="mt-2"
                value={toDatetimeLocalValue(field.value)}
                onChange={(e) => field.onChange(new Date(e.target.value).getTime())}
              />
            )}
          />
        </div>
        <div>
          <Label htmlFor="endAt">Window closes to new starts</Label>
          <Controller
            control={control}
            name="endAt"
            render={({ field }) => (
              <Input
                id="endAt"
                type="datetime-local"
                className="mt-2"
                value={toDatetimeLocalValue(field.value)}
                onChange={(e) => field.onChange(new Date(e.target.value).getTime())}
              />
            )}
          />
          {errors.endAt && <p className="mt-1.5 text-sm text-destructive">{errors.endAt.message}</p>}
        </div>

        <div>
          <Label htmlFor="durationMinutes">Duration per student (minutes)</Label>
          <Input
            id="durationMinutes"
            type="number"
            min={1}
            className="mt-2"
            {...register("durationMinutes", { valueAsNumber: true })}
          />
        </div>
        <div>
          <Label htmlFor="questionCount">Questions per student</Label>
          <Input
            id="questionCount"
            type="number"
            min={1}
            className="mt-2"
            {...register("questionCount", { valueAsNumber: true })}
          />
        </div>
      </div>

      <div className="flex flex-col gap-4 rounded-2xl border bg-card p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Exam open</p>
            <p className="text-xs text-muted-foreground">
              Students can only start new sessions while this is on and within the window.
            </p>
          </div>
          <Controller
            control={control}
            name="isOpen"
            render={({ field }) => (
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            )}
          />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Show results to students</p>
            <p className="text-xs text-muted-foreground">
              If off, students just see a &quot;submitted&quot; confirmation, no score.
            </p>
          </div>
          <Controller
            control={control}
            name="resultsVisibleToStudents"
            render={({ field }) => (
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            )}
          />
        </div>
      </div>

      <Button type="submit" disabled={saving} className="w-full gap-1.5 sm:w-fit">
        {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
        Save configuration
      </Button>
    </form>
  );
}
