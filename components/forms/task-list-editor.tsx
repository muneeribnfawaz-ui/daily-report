"use client";

import { Button } from "@/components/ui/button";
import { ReportField, ReportInput } from "@/components/forms/report-controls";

export type TaskListEditorProps = {
  label: string;
  required?: boolean;
  helperText?: string;
  placeholder: string;
  items: string[];
  draftValue: string;
  error?: string;
  onAdd: (task: string) => void;
  onRemove: (index: number) => void;
  onDraftChange: (value: string) => void;
};

export function TaskListEditor({
  label,
  required,
  helperText,
  placeholder,
  items,
  draftValue,
  error,
  onAdd,
  onRemove,
  onDraftChange
}: TaskListEditorProps) {
  const handleAdd = () => {
    const value = draftValue.trim();
    if (!value) return;
    onAdd(value);
    onDraftChange("");
  };

  return (
    <ReportField className="md:col-span-2" error={error} required={required} label={label}>
      <div className="space-y-3">
        <div>{helperText ? <div className="mt-1 text-xs text-muted-foreground">{helperText}</div> : null}</div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <ReportInput
            placeholder={placeholder}
            value={draftValue}
            onChange={(event) => onDraftChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                handleAdd();
              }
            }}
          />
          <Button type="button" variant="outline" onClick={handleAdd} className="sm:w-auto">
            Add Task
          </Button>
        </div>

        {items.length ? (
          <div className="space-y-2 rounded-2xl border bg-background/70 p-3">
            {items.map((item, index) => (
              <div key={`${label}-${index}-${item}`} className="flex items-start justify-between gap-3 rounded-xl bg-muted/40 px-3 py-2">
                <div className="min-w-0 flex-1 text-sm leading-6 text-foreground">
                  <span className="mr-2 font-semibold text-muted-foreground">Task {index + 1}.</span>
                  <span className="break-words">{item}</span>
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={() => onRemove(index)} className="h-8 shrink-0 px-2 text-muted-foreground">
                  Remove
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed bg-background/60 px-3 py-4 text-sm text-muted-foreground">No tasks added yet.</div>
        )}
      </div>
    </ReportField>
  );
}
