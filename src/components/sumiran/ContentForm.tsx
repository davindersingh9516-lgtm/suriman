import { useState } from "react";
import type { ContentDraft, ContentType } from "@/services/supabase/content";
import { cn } from "@/lib/utils";

interface Props {
  initial: ContentDraft;
  onSubmit: (draft: ContentDraft) => void | Promise<void>;
  submitLabel: string;
  submitIcon: React.ReactNode;
  disabled?: boolean;
  lockType?: boolean;
}

const TYPES: { value: ContentType; label: string; hindi: string }[] = [
  { value: "mantra", label: "Mantra", hindi: "मंत्र" },
  { value: "chalisa", label: "Chalisa", hindi: "चालीसा" },
  { value: "aarti", label: "Aarti", hindi: "आरती" },
];

/**
 * Shared admin form for create/edit content. Mobile-first, big inputs for
 * Neha's phone-based workflow. Hindi+English side by side.
 */
export function ContentForm({ initial, onSubmit, submitLabel, submitIcon, disabled, lockType }: Props) {
  const [draft, setDraft] = useState<ContentDraft>(initial);

  const update = <K extends keyof ContentDraft>(key: K, value: ContentDraft[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.title_hi.trim() || !draft.title_en.trim()) return;
    onSubmit(draft);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Type */}
      <Field label="Type · प्रकार">
        <div className="grid grid-cols-3 gap-2">
          {TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              disabled={lockType}
              onClick={() => update("type", t.value)}
              className={cn(
                "py-3 rounded-xl text-sm font-semibold transition border",
                draft.type === t.value
                  ? "bg-saffron text-primary-foreground border-saffron"
                  : "bg-card text-foreground/70 border-border",
                lockType && "opacity-60 cursor-not-allowed",
              )}
            >
              <div className="font-mantra text-base">{t.hindi}</div>
              <div className="text-[11px]">{t.label}</div>
            </button>
          ))}
        </div>
      </Field>

      {/* Titles */}
      <Field label="Title (Hindi) · शीर्षक" required>
        <input
          value={draft.title_hi}
          onChange={(e) => update("title_hi", e.target.value)}
          required
          className="form-input font-mantra text-xl"
          placeholder="हनुमान चालीसा"
        />
      </Field>
      <Field label="Title (English)" required>
        <input
          value={draft.title_en}
          onChange={(e) => update("title_en", e.target.value)}
          required
          className="form-input"
          placeholder="Hanuman Chalisa"
        />
      </Field>

      <Field label="Deity · देवता">
        <input
          value={draft.deity ?? ""}
          onChange={(e) => update("deity", e.target.value)}
          className="form-input"
          placeholder="Hanuman, Shiva, Durga…"
        />
      </Field>

      {/* Body */}
      <Field label="Body / Verses (Hindi) · पाठ">
        <textarea
          value={draft.body_hi ?? ""}
          onChange={(e) => update("body_hi", e.target.value)}
          rows={10}
          className="form-input font-mantra text-lg leading-relaxed"
          placeholder={"श्रीगुरु चरन सरोज रज,\nनिज मन मुकुरु सुधारि।\n\n(Use blank line between verses)"}
        />
      </Field>
      <Field label="Body / Verses (English)">
        <textarea
          value={draft.body_en ?? ""}
          onChange={(e) => update("body_en", e.target.value)}
          rows={6}
          className="form-input"
          placeholder="Optional English transliteration or translation"
        />
      </Field>

      <Field label="Meaning (one line)">
        <input
          value={draft.meaning ?? ""}
          onChange={(e) => update("meaning", e.target.value)}
          className="form-input"
          placeholder="Salutations to Lord Shiva"
        />
      </Field>

      {/* Order + Slug */}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Sort order">
          <input
            type="number"
            value={draft.order_index}
            onChange={(e) => update("order_index", Number(e.target.value) || 0)}
            className="form-input"
          />
        </Field>
        <Field label="Slug (auto)">
          <input
            value={draft.slug}
            onChange={(e) => update("slug", e.target.value)}
            className="form-input"
            placeholder="hanuman-chalisa"
          />
        </Field>
      </div>

      {/* Published */}
      <label className="flex items-center justify-between p-4 rounded-2xl bg-card border border-border cursor-pointer">
        <div>
          <div className="font-semibold text-base text-foreground">Published</div>
          <div className="text-xs text-muted-foreground">Visible to all users when on</div>
        </div>
        <input
          type="checkbox"
          checked={draft.is_published}
          onChange={(e) => update("is_published", e.target.checked)}
          className="h-6 w-6 accent-saffron"
        />
      </label>

      <button
        type="submit"
        disabled={disabled}
        className="w-full h-14 rounded-2xl bg-saffron text-primary-foreground font-semibold text-base shadow-elevated active:scale-[0.99] transition flex items-center justify-center gap-2 disabled:opacity-60"
      >
        {submitIcon}
        {submitLabel}
      </button>

      <style>{`
        .form-input {
          width: 100%;
          min-height: 3.5rem;
          padding: 0.875rem 1rem;
          border-radius: 1rem;
          background: var(--color-card);
          border: 1px solid var(--color-border);
          color: var(--color-foreground);
          font-size: 1rem;
        }
        .form-input:focus {
          outline: none;
          box-shadow: 0 0 0 2px var(--color-ring);
        }
        textarea.form-input {
          min-height: auto;
          resize: vertical;
        }
      `}</style>
    </form>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-foreground mb-1.5 px-1">
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </label>
      {children}
    </div>
  );
}
