import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { OrderStatus } from "@/types";
import { STATUS_LABELS, STATUS_COLORS } from "@/types";

interface StatusBadgeProps {
  status: OrderStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <Badge variant="secondary" className={cn("font-medium text-xs", STATUS_COLORS[status], className)}>
      {STATUS_LABELS[status]}
    </Badge>
  );
}
