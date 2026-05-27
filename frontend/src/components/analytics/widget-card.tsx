"use client";
/**
 * WidgetCard — shell every dashboard widget renders inside.
 *
 * Handles the boring chrome: title row, optional "remove" button,
 * loading/error states. Drag handle is the title row (className
 * "widget-drag-handle"); react-grid-layout reads draggableHandle
 * from DashboardCanvas, not from here, so child interactive content
 * inside CardContent stays clickable.
 */
import { Loader2, X } from "lucide-react";
import { ReactNode } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface Props {
  title: ReactNode;
  children: ReactNode;
  isLoading?: boolean;
  error?: Error | null;
  onRemove?: () => void;
  className?: string;
  /** Extra header content (filter pill, link, etc.) */
  headerAction?: ReactNode;
}

export function WidgetCard({
  title,
  children,
  isLoading,
  error,
  onRemove,
  className,
  headerAction,
}: Props) {
  return (
    <Card variant="default" className={cn("h-full flex flex-col", className)}>
      <div className="widget-drag-handle flex items-center justify-between gap-2 px-4 py-3 border-b border-border cursor-move select-none">
        <div className="flex items-center gap-2 min-w-0">
          <div className="font-semibold text-sm text-text truncate">{title}</div>
        </div>
        <div className="flex items-center gap-1">
          {headerAction}
          {onRemove ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              className="p-1 rounded hover:bg-surface-2 text-text-muted hover:text-text"
              aria-label="Remove widget"
            >
              <X className="w-4 h-4" />
            </button>
          ) : null}
        </div>
      </div>
      <CardContent className="flex-1 min-h-0 overflow-auto !px-4 !py-3">
        {isLoading ? (
          <div className="flex items-center justify-center h-full text-text-muted">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : error ? (
          <div className="text-sm text-danger">
            {error.message || "Failed to load widget"}
          </div>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}
