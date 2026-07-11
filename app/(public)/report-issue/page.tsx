"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  AlertTriangle, 
  CheckCircle2, 
  ArrowLeft, 
  Search, 
  Loader2, 
  HelpCircle, 
  Send,
  User,
  MapPin,
  Check
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface StudentInfo {
  studentId: string;
  studentName: string;
  district: string;
  division: string;
}

const ISSUE_OPTIONS = [
  { value: "progress_lost", label: "Answers not saving / Progress lost", description: "You answered questions but they cleared out, or your attempt counts showed 0." },
  { value: "delayed_submit", label: "Exam hung / Slow submission timeout", description: "The exam ended or you clicked submit, but the loading screen got stuck." },
  { value: "login_issue", label: "Could not log in to exam", description: "You faced loading loops or credentials errors when trying to start the exam." },
  { value: "crash", label: "Website crashed / Went blank", description: "The browser window turned white, reloaded constantly, or the exam runner crashed." },
  { value: "other", label: "Other technical server issue", description: "Any other problem with the site or exam connection." }
];

export default function ReportIssuePage() {
  // Navigation states: 'search' | 'form' | 'success'
  const [step, setStep] = useState<"search" | "form" | "success">("search");
  
  // Form states
  const [identifier, setIdentifier] = useState("");
  const [searching, setSearching] = useState(false);
  const [studentInfo, setStudentInfo] = useState<StudentInfo | null>(null);
  
  const [issueType, setIssueType] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // 1. Search student and verify attempt
  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!identifier.trim()) {
      toast.error("Please enter your Student ID or Phone number.");
      return;
    }

    setSearching(true);
    try {
      const res = await fetch("/api/report-issue/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier }),
      });
      const data = await res.json();
      
      if (!res.ok) {
        toast.error(data.error ?? "Failed to find exam attempt.");
        return;
      }

      setStudentInfo(data.student);
      setStep("form");
      toast.success("Exam attempt found!");
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setSearching(false);
    }
  }

  // 2. Submit report details
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!issueType) {
      toast.error("Please select the type of issue you experienced.");
      return;
    }
    if (!description.trim() || description.trim().length < 10) {
      toast.error("Please explain your issue in at least 10 characters.");
      return;
    }
    if (!studentInfo) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/report-issue/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: studentInfo.studentId,
          issueType,
          description,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error ?? "Failed to submit report.");
        return;
      }

      setStep("success");
    } catch {
      toast.error("Network error during submission. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  // Back action
  function handleBack() {
    setStep("search");
    setIssueType("");
    setDescription("");
  }

  return (
    <div className="relative min-h-dvh flex flex-col justify-between overflow-x-hidden bg-background">
      {/* Visual background details */}
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
      
      {/* Floating abstract blur items */}
      <div className="absolute top-[-10%] left-[-10%] -z-10 size-[350px] rounded-full bg-primary/10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] -z-10 size-[350px] rounded-full bg-indigo-500/10 blur-[100px] pointer-events-none" />

      {/* Header bar */}
      <header className="border-b bg-background/80 backdrop-blur sticky top-0 z-20">
        <div className="mx-auto max-w-xl px-4 py-3 flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors font-medium">
            <ArrowLeft className="size-3.5" /> Home
          </Link>
          <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            SensET Support
          </span>
        </div>
      </header>

      {/* Main card section */}
      <main className="flex-1 flex items-center justify-center p-4 py-8">
        <div className="w-full max-w-lg">
          <AnimatePresence mode="wait">
            
            {/* STEP 1: Search student record */}
            {step === "search" && (
              <motion.div
                key="search-box"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className="bg-card border rounded-2xl p-6 shadow-xl relative overflow-hidden"
              >
                <div className="text-center mb-6">
                  <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive mb-3">
                    <AlertTriangle className="size-6" />
                  </div>
                  <h1 className="text-xl font-bold text-foreground">Report Exam Issue</h1>
                  <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                    Experiencing technical glitches, saving problems, or submission lag? 
                    Verify your attempt below to report your issue to the exam admins.
                  </p>
                </div>

                <form onSubmit={handleSearch} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Student ID or Registered Phone
                    </label>
                    <div className="relative">
                      <Search className="absolute left-3 top-3 size-4.5 text-muted-foreground" />
                      <Input
                        placeholder="e.g. SENS2026101 or 9562770000"
                        className="pl-9.5 h-10.5 rounded-xl text-sm"
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        disabled={searching}
                      />
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full h-10.5 rounded-xl gap-2 font-medium" 
                    disabled={searching}
                  >
                    {searching ? (
                      <>
                        <Loader2 className="size-4 animate-spin" /> Verifying attempt...
                      </>
                    ) : (
                      <>
                        Find My Exam Record
                      </>
                    )}
                  </Button>
                </form>

                <div className="mt-5 border-t pt-4 text-center">
                  <p className="text-[11px] text-muted-foreground leading-normal">
                    Note: Only students who have launched or attempted the exam sessions are eligible to report server issues.
                  </p>
                </div>
              </motion.div>
            )}

            {/* STEP 2: Issue reporting form */}
            {step === "form" && studentInfo && (
              <motion.div
                key="form-box"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className="bg-card border rounded-2xl p-6 shadow-xl space-y-6"
              >
                {/* Back button */}
                <button
                  type="button"
                  onClick={handleBack}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors font-medium"
                >
                  <ArrowLeft className="size-3.5" /> Back to Search
                </button>

                {/* Student Info Pill Card */}
                <div className="rounded-xl border border-muted bg-muted/30 p-3.5 flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <User className="size-4.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-foreground truncate">{studentInfo.studentName}</h3>
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1.5 mt-0.5 truncate">
                      <span>ID: {studentInfo.studentId}</span>
                      <span>•</span>
                      <span className="flex items-center gap-0.5 truncate">
                        <MapPin className="size-2.5" /> {studentInfo.district}, {studentInfo.division}
                      </span>
                    </p>
                  </div>
                  <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold px-2 py-0.5 rounded-full border border-emerald-500/15 flex items-center gap-1 shrink-0">
                    <Check className="size-2.5" /> Verified
                  </span>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Select issue type */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      What problem did you face?
                    </label>
                    <div className="grid grid-cols-1 gap-2.5">
                      {ISSUE_OPTIONS.map((opt) => {
                        const selected = issueType === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setIssueType(opt.value)}
                            className={`flex flex-col text-left p-3.5 rounded-xl border-2 transition-all ${
                              selected 
                                ? "border-primary bg-primary/5 dark:bg-primary/10 shadow-sm" 
                                : "border-border hover:border-muted-foreground/30 hover:bg-muted/10 bg-card"
                            }`}
                          >
                            <span className="text-xs font-bold text-foreground flex items-center gap-2">
                              <span className={`size-3.5 rounded-full border-2 flex items-center justify-center ${selected ? "border-primary" : "border-muted-foreground/40"}`}>
                                {selected && <span className="size-1.5 rounded-full bg-primary" />}
                              </span>
                              {opt.label}
                            </span>
                            <span className="text-[10px] text-muted-foreground mt-1 pl-5 leading-normal">
                              {opt.description}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Textarea description */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Details / Explain what happened
                    </label>
                    <textarea
                      placeholder="Explain in details what went wrong. For example: 'When my timer reached 2:00 my page went blank' or 'I marked option B but it stayed white'..."
                      rows={4}
                      className="w-full text-sm rounded-xl border border-input bg-card p-3 shadow-inner placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 transition-all disabled:opacity-50"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      disabled={submitting}
                      maxLength={1500}
                    />
                    <div className="flex justify-between text-[10px] text-muted-foreground px-1">
                      <span>Provide as much details as possible</span>
                      <span>{description.length}/1500 chars</span>
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full h-10.5 rounded-xl gap-2 font-medium" 
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="size-4 animate-spin" /> Submitting issue...
                      </>
                    ) : (
                      <>
                        <Send className="size-4" /> Submit Diagnostic Report
                      </>
                    )}
                  </Button>
                </form>
              </motion.div>
            )}

            {/* STEP 3: Success Screen */}
            {step === "success" && (
              <motion.div
                key="success-box"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className="bg-card border rounded-2xl p-8 shadow-xl text-center relative overflow-hidden"
              >
                {/* Background glow */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-40 bg-emerald-500/10 rounded-full blur-2xl -z-10 pointer-events-none" />

                <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 mb-4 animate-bounce">
                  <CheckCircle2 className="size-8" />
                </div>
                
                <h1 className="text-xl font-bold text-foreground">Report Submitted Successfully</h1>
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed max-w-sm mx-auto">
                  Thank you. Your diagnostic feedback has been filed directly in our admin panel. 
                  Exam administrators will cross-reference this report with server logs when analyzing scores.
                </p>

                <div className="mt-8 space-y-3">
                  <Link href="/">
                    <Button variant="outline" className="w-full h-10 rounded-xl font-medium text-xs">
                      Return to Home
                    </Button>
                  </Link>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </main>

      {/* Footer bar */}
      <footer className="border-t py-4 text-center">
        <p className="text-[10px] text-muted-foreground">
          &copy; 2026 SensET Examination Committee. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
