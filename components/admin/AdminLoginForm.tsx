"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, type Variants } from "framer-motion";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { Loader2, Lock, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { auth } from "@/lib/firebase/client";
import { adminLoginSchema, type AdminLoginInput } from "@/lib/validation/schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const container: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.05 } },
};

const item: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
};

export function AdminLoginForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AdminLoginInput>({
    resolver: zodResolver(adminLoginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: AdminLoginInput) {
    setSubmitting(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, values.email, values.password);
      const tokenResult = await cred.user.getIdTokenResult(true);
      if (tokenResult.claims.admin !== true) {
        await signOut(auth);
        toast.error("This account doesn't have admin access.");
        return;
      }
      router.push("/admin/dashboard");
    } catch {
      toast.error("Invalid email or password.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-5 py-12">
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="flex w-full max-w-sm flex-col items-center"
      >
        <motion.div
          variants={item}
          className="mb-5 flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/25"
        >
          <Lock className="size-7" />
        </motion.div>
        <motion.h1 variants={item} className="text-xl font-semibold tracking-tight">
          SensET Admin
        </motion.h1>
        <motion.p variants={item} className="mt-1.5 text-sm text-muted-foreground">
          Sign in to manage the examination.
        </motion.p>

        <motion.form
          variants={item}
          onSubmit={handleSubmit(onSubmit)}
          className="mt-8 w-full rounded-2xl border bg-card p-6 text-left shadow-sm"
        >
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="username"
            className="mt-2 h-11"
            {...register("email")}
          />
          {errors.email && <p className="mt-1.5 text-sm text-destructive">{errors.email.message}</p>}

          <Label htmlFor="password" className="mt-4 block">
            Password
          </Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            className="mt-2 h-11"
            {...register("password")}
          />
          {errors.password && (
            <p className="mt-1.5 text-sm text-destructive">{errors.password.message}</p>
          )}

          <Button type="submit" disabled={submitting} className="mt-6 h-11 w-full">
            {submitting ? <Loader2 className="size-4 animate-spin" /> : "Sign in"}
          </Button>

          <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="size-3.5" /> Admin access only
          </p>
        </motion.form>
      </motion.div>
    </div>
  );
}
