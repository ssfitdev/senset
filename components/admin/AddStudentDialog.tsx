"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

import { authFetch } from "@/lib/firebase/authFetch";
import { studentRowSchema, type StudentRowInput } from "@/lib/validation/schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const FIELDS: { name: keyof StudentRowInput; label: string }[] = [
  { name: "studentId", label: "Student ID" },
  { name: "name", label: "Name" },
  { name: "phone", label: "Phone Number" },
  { name: "district", label: "District" },
  { name: "division", label: "Division" },
];

export function AddStudentDialog({ onAdded }: { onAdded?: () => void }) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<StudentRowInput>({
    resolver: zodResolver(studentRowSchema),
    defaultValues: { studentId: "", name: "", phone: "", district: "", division: "" },
  });

  async function onSubmit(values: StudentRowInput) {
    setSubmitting(true);
    try {
      const res = await authFetch("/api/admin/students", {
        method: "POST",
        body: JSON.stringify([values]),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Couldn't add the student.");
        return;
      }
      toast.success(`Added ${values.name}.`);
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
          <Plus className="size-4" /> Add student
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm rounded-2xl">
        <DialogHeader>
          <DialogTitle>Add a student</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
          {FIELDS.map(({ name, label }) => (
            <div key={name}>
              <Label htmlFor={name}>{label}</Label>
              <Input id={name} className="mt-1.5" {...register(name)} />
              {errors[name] && (
                <p className="mt-1 text-xs text-destructive">{errors[name]?.message}</p>
              )}
            </div>
          ))}
          <DialogFooter className="mt-2">
            <Button type="submit" disabled={submitting} className="w-full gap-1.5">
              {submitting ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              Add student
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
