"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type LeaveRejectionNoteModalProps = {
  open: boolean;
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  onClose: () => void;
};

export function LeaveRejectionNoteModal({ open, value, onChange, onSubmit, onClose }: LeaveRejectionNoteModalProps) {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    setError(null);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const handleSubmit = () => {
    const trimmedValue = value.trim();
    if (!trimmedValue) {
      setError("Rejection description is required.");
      return;
    }

    setError(null);
    onSubmit(trimmedValue);
  };

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-3xl border border-cardBorder bg-card p-5 shadow-2xl sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">Reject description</div>
            <h3 className="mt-2 text-lg font-semibold text-foreground">Add a rejection note</h3>
            <p className="mt-1 text-sm text-muted-foreground">This note will be saved with the rejection and can be shown in notifications.</p>
          </div>
          <Button size="sm" variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>

        <div className="mt-5 space-y-4">
          <Textarea
            value={value}
            onChange={(event) => {
              setError(null);
              onChange(event.target.value);
            }}
            placeholder="Add reason for rejection"
            className="min-h-60 resize-y text-sm leading-6"
          />
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>Submit Reject Note</Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
