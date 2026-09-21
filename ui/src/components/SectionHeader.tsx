import { Badge } from "@astryxdesign/core/Badge";
import React, { ReactNode } from "react";

interface SectionHeaderProps {
  title: string;
  count?: number | string;
  badgeVariant?: "neutral" | "success" | "warning" | "error" | "info";
  description?: string;
  actions?: ReactNode;
  id?: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  count,
  badgeVariant = "neutral",
  description,
  actions,
  id,
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-0.5" id={id}>
      <div className="flex items-center gap-2 flex-wrap">
        <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
          {title}
        </h3>
        {count !== undefined && (
          <Badge variant={badgeVariant} label={String(count)} />
        )}
        {description && (
          <span className="text-xs text-neutral-500">
            • {description}
          </span>
        )}
      </div>

      {actions && (
        <div className="flex items-center gap-2">
          {actions}
        </div>
      )}
    </div>
  );
};
