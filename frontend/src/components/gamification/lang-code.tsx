import { cn } from "@/lib/utils";

interface LangCodeProps {
  code: string;
  label: string;
  active?: boolean;
  onClick?: () => void;
}

export function LangCode({ code, label, active = false, onClick }: LangCodeProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-left text-sm font-semibold transition",
        active
          ? "border-2 border-green-500 bg-success-soft text-success-fg"
          : "border border-border bg-surface text-text hover:border-border-strong hover:bg-surface-2",
      )}
    >
      <span
        className={cn(
          "grid h-[22px] w-[30px] flex-shrink-0 place-items-center rounded-xs font-mono text-3xs font-bold uppercase tracking-[0.08em]",
          active ? "bg-primary text-primary-fg" : "bg-surface-2 text-text",
        )}
      >
        {code.toUpperCase().slice(0, 2)}
      </span>
      <span>{label}</span>
    </button>
  );
}
