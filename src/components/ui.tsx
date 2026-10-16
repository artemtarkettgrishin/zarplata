import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/utils/cn";

/* ------------------------------- Card ------------------------------- */

export function Card({
  children,
  className,
  padded = true,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-200/50",
        padded && "p-5",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CardTitle({
  title,
  subtitle,
  icon,
  right,
}: {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div className="flex items-start gap-3">
        {icon ? (
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            {icon}
          </span>
        ) : null}
        <div>
          <h3 className="text-base font-semibold text-slate-900">{title}</h3>
          {subtitle ? <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p> : null}
        </div>
      </div>
      {right}
    </div>
  );
}

/* ------------------------------ Button ------------------------------ */

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "success";

export function Button({
  children,
  onClick,
  variant = "primary",
  className,
  type = "button",
  disabled,
  title,
  size = "md",
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: ButtonVariant;
  className?: string;
  type?: "button" | "submit";
  disabled?: boolean;
  title?: string;
  size?: "sm" | "md";
}) {
  const variants: Record<ButtonVariant, string> = {
    primary:
      "bg-indigo-600 text-white hover:bg-indigo-700 focus-visible:outline-indigo-600 shadow-sm",
    secondary:
      "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 focus-visible:outline-slate-400",
    ghost: "bg-transparent text-slate-600 hover:bg-slate-100",
    danger: "bg-rose-600 text-white hover:bg-rose-700 focus-visible:outline-rose-600 shadow-sm",
    success: "bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm",
  };
  return (
    <button
      type={type}
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        size === "sm" ? "px-3 py-1.5 text-sm" : "px-4 py-2.5 text-sm",
        variants[variant],
        className,
      )}
    >
      {children}
    </button>
  );
}

/* ------------------------------ Inputs ------------------------------ */

const fieldBase =
  "w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20";

export function Field({
  label,
  children,
  hint,
  className,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span>
      {children}
      {hint ? <span className="mt-1.5 block text-xs text-slate-500">{hint}</span> : null}
    </label>
  );
}

export function TextInput({
  value,
  onChange,
  placeholder,
  className,
  type = "text",
  autoFocus,
  onKeyDown,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  type?: string;
  autoFocus?: boolean;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}) {
  return (
    <input
      type={type}
      value={value}
      autoFocus={autoFocus}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={cn(fieldBase, className)}
    />
  );
}

export function Select({
  value,
  onChange,
  options,
  className,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  className?: string;
  disabled?: boolean;
}) {
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        fieldBase,
        "appearance-none bg-white pr-9 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400",
        className,
      )}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E\")",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 0.6rem center",
        backgroundSize: "1.1rem",
      }}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

/* ------------------------------- Badge ------------------------------ */

export function Badge({
  children,
  tone = "slate",
  className,
}: {
  children: ReactNode;
  tone?: "slate" | "green" | "red" | "amber" | "indigo" | "cyan";
  className?: string;
}) {
  const tones: Record<string, string> = {
    slate: "bg-slate-100 text-slate-700",
    green: "bg-emerald-100 text-emerald-700",
    red: "bg-rose-100 text-rose-700",
    amber: "bg-amber-100 text-amber-700",
    indigo: "bg-indigo-100 text-indigo-700",
    cyan: "bg-cyan-100 text-cyan-700",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/* ------------------------------- Modal ------------------------------ */

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  width = "max-w-lg",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div
        className={cn(
          "max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:rounded-2xl",
          width,
        )}
      >
        <div className="sticky top-0 flex items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur">
          <h3 className="text-base font-semibold text-slate-900">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Закрыть"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-5 py-5">{children}</div>
        {footer ? (
          <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-4">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/* ---------------------------- Empty state --------------------------- */

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 px-6 py-12 text-center">
      {icon ? (
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm">
          {icon}
        </span>
      ) : null}
      <div>
        <p className="font-semibold text-slate-800">{title}</p>
        {description ? (
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

/* ------------------------------ Confirm ----------------------------- */

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Удалить",
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      width="max-w-md"
      footer={
        <>
          <Button variant="secondary" onClick={onCancel}>
            Отмена
          </Button>
          <Button variant="danger" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-sm leading-relaxed text-slate-600">{message}</p>
    </Modal>
  );
}
