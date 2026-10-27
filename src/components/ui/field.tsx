import { CircleAlert } from "lucide-react";
import type { ReactNode } from "react";

/** Label + control + hint or error. Tight inside, generous around (spacing rule). */
export function Field({
  label,
  htmlFor,
  hint,
  error,
  optional,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: ReactNode;
  error?: string;
  optional?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={htmlFor} className="font-semibold">
        {label}
        {optional ? <span className="font-normal text-pencil"> (optional)</span> : null}
      </label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} className="flex items-start gap-1 text-sm text-red" role="alert">
          <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
          {error}
        </p>
      ) : hint ? (
        <p id={`${htmlFor}-hint`} className="text-sm text-pencil">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export const inputClass =
  "w-full min-h-12 rounded-md border-2 border-slate-300 bg-paper px-3 py-2 text-base text-ink placeholder:text-slate-500 hover:border-slate-400 focus-visible:border-ink focus-visible:outline-none aria-[invalid=true]:border-red";

export function FormError({ message }: { message?: string | null }) {
  return (
    <p aria-live="polite" className="min-h-0 text-red empty:hidden">
      {message ? (
        <span className="flex items-start gap-2">
          <CircleAlert aria-hidden className="mt-0.5 size-5 shrink-0" />
          {message}
        </span>
      ) : null}
    </p>
  );
}
