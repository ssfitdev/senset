"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import {
  BarChart3,
  LayoutDashboard,
  ListChecks,
  LogOut,
  MessageSquare,
  Radio,
  Settings,
  Timer,
  Trophy,
  Users,
} from "lucide-react";

import { auth } from "@/lib/firebase/client";
import { useAdminUser } from "@/hooks/useAdminUser";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/exam-config", label: "Config", icon: Settings },
  { href: "/admin/students", label: "Students", icon: Users },
  { href: "/admin/questions", label: "Questions", icon: ListChecks },
  { href: "/admin/live", label: "Live", icon: Radio },
  { href: "/admin/results", label: "Results", icon: Trophy },
  { href: "/admin/session-analytics", label: "Session Stats", icon: Timer },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/feedback", label: "Feedback", icon: MessageSquare },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAdmin, loading } = useAdminUser();

  useEffect(() => {
    if (loading) return;
    if (!user || !isAdmin) {
      router.replace("/admin/login");
    }
  }, [loading, user, isAdmin, router]);

  if (loading || !user || !isAdmin) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-5xl flex-col gap-4 px-5 py-8">
        <Skeleton className="h-10 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-10 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <p className="font-semibold">SensET Admin</p>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-muted-foreground"
            onClick={() => signOut(auth).then(() => router.replace("/admin/login"))}
          >
            <LogOut className="size-4" />
            <span className="hidden sm:inline">Sign out</span>
          </Button>
        </div>
        {/* Desktop/tablet nav — replaced by the fixed bottom tab bar on mobile. */}
        <nav className="mx-auto hidden max-w-5xl gap-1 overflow-x-auto px-4 pb-2 md:flex">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted",
                )}
              >
                <Icon className="size-4" />
                {label}
              </Link>
            );
          })}
        </nav>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 pb-24 md:pb-6">{children}</main>

      <nav
        className="fixed inset-x-0 bottom-0 z-20 flex border-t bg-background/95 backdrop-blur md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <Icon className={cn("size-5", active && "fill-primary/15")} />
              {label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
