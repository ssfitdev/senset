"use client";

import { useState } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { MessageSquarePlus, Loader2, Send } from "lucide-react";
import { toast } from "sonner";

import { db } from "@/lib/firebase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface FeedbackDialogProps {
  studentId: string;
  studentName: string;
}

export function FeedbackDialog({ studentId, studentName }: FeedbackDialogProps) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit() {
    const trimmed = message.trim();
    if (!trimmed) {
      toast.error("Please write something before sending.");
      return;
    }
    setSubmitting(true);
    try {
      await addDoc(collection(db, "feedback"), {
        studentId,
        studentName,
        message: trimmed,
        createdAt: serverTimestamp(),
      });
      setSent(true);
      setMessage("");
      toast.success("Thanks for your feedback!");
    } catch {
      toast.error("Couldn't send your feedback — check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setSent(false);
      }}
    >
      <Button variant="outline" className="gap-1.5" onClick={() => setOpen(true)}>
        <MessageSquarePlus className="size-4" />
        Give feedback or suggestions
      </Button>
      <DialogContent className="sm:max-w-sm rounded-2xl">
        <DialogHeader>
          <DialogTitle>{sent ? "Thanks for sharing!" : "Feedback or suggestions"}</DialogTitle>
        </DialogHeader>

        {sent ? (
          <p className="text-sm text-muted-foreground">
            Your message has been sent to the exam administrators.
          </p>
        ) : (
          <>
            <div>
              <Label htmlFor="feedback-message">Your message</Label>
              <textarea
                id="feedback-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Tell us what worked well, what didn't, or any suggestions you have…"
                rows={5}
                maxLength={2000}
                className="mt-2 w-full resize-none rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
            </div>
            <DialogFooter>
              <Button onClick={handleSubmit} disabled={submitting} className="w-full gap-1.5">
                {submitting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
                Send
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
