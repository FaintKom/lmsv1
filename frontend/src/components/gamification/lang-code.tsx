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
        "flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-left text-sm font-semibold transition-all",
        active
          ? "border-2 border-green-500 bg-green-50 text-green-800"
          : "border border-ink-100 bg-paper-2 text-ink-700 hover:border-ink-300 hover:bg-surface-2",
      )}
    >
      <span
        className={cn(
          "grid h-[22px] w-[30px] flex-shrink-0 place-items-center rounded-[5px] font-mono text-[10px] font-bold uppercase tracking-[0.08em]",
          active ? "bg-green-600 text-white" : "bg-ink-100 text-ink-700",
        )}
      >
        {code.toUpperCase().slice(0, 2)}
      </span>
      <span>{label}</span>
    </button>
  );
}
