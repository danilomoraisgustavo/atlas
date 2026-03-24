import { Clock, CheckCircle, XCircle, Play, Upload, Send, Ruler } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TimelineEvent } from "@/types";

interface OrderTimelineProps {
  events: TimelineEvent[];
}

const ACTION_ICONS: Record<string, React.ElementType> = {
  Cadastro: Upload,
  Aprovação: CheckCircle,
  Reprovação: XCircle,
  Início: Play,
  Conclusão: Send,
  Validação: CheckCircle,
  Retrabalho: XCircle,
  Medição: Ruler,
};

export function OrderTimeline({ events }: OrderTimelineProps) {
  return (
    <div className="relative space-y-0">
      {events.map((event, index) => {
        const Icon = ACTION_ICONS[event.action] || Clock;
        const isLast = index === events.length - 1;
        return (
          <div key={event.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0 z-10">
                <Icon className="w-3.5 h-3.5" />
              </div>
              {!isLast && <div className="w-px flex-1 bg-border min-h-[24px]" />}
            </div>
            <div className={cn("pb-4", isLast && "pb-0")}>
              <p className="text-sm font-medium text-foreground">{event.action}</p>
              <p className="text-xs text-muted-foreground">{event.description}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {event.userName} • {new Date(event.timestamp).toLocaleString("pt-BR")}
              </p>
              {event.justification && (
                <p className="text-xs bg-destructive/10 text-destructive rounded px-2 py-1 mt-1">
                  Motivo: {event.justification}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
