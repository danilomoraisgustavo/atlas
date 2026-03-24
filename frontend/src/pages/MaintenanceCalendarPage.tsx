import { useEffect, useMemo, useState } from 'react';
import { CalendarClock, CheckCheck, ChevronLeft, ChevronRight, Droplets, Wind } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useAuth, getApiErrorMessage } from '@/contexts/AuthContext';
import { apiFetch } from '@/api/client';
import type { MaintenanceCalendarItem, MaintenanceCalendarResponse } from '@/types/app';
import { toast } from 'sonner';

function getMonthLabel(month: string) {
  const [year, monthValue] = month.split('-').map(Number);
  return new Date(year, monthValue - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

function shiftMonth(month: string, delta: number) {
  const [year, monthValue] = month.split('-').map(Number);
  const date = new Date(year, monthValue - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function taskIcon(taskType: string) {
  if (taskType.includes('lubrificacao')) return Droplets;
  if (taskType.includes('ar')) return Wind;
  return CalendarClock;
}

export default function MaintenanceCalendarPage() {
  const { token, user } = useAuth();
  const [month, setMonth] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  });
  const [data, setData] = useState<MaintenanceCalendarResponse | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const canEdit = user?.role === 'fornecedor';

  const load = async (selectedMonth: string) => {
    try {
      const response = await apiFetch<MaintenanceCalendarResponse>('/maintenance/calendar', { token, params: { month: selectedMonth } });
      setData(response);
      setNotes(
        Object.fromEntries(
          response.weeks.flatMap((week) => week.items.map((item) => [`${item.vehicle_id}-${item.task_type}-${item.scheduled_date}`, item.notes || ''])),
        ),
      );
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  };

  useEffect(() => {
    void load(month);
  }, [month, token]);

  const summary = useMemo(() => {
    const items = data?.weeks.flatMap((week) => week.items) || [];
    return {
      total: items.length,
      done: items.filter((item) => item.completed).length,
      pending: items.filter((item) => !item.completed).length,
    };
  }, [data]);

  const saveItem = async (item: MaintenanceCalendarItem, completed: boolean) => {
    const key = `${item.vehicle_id}-${item.task_type}-${item.scheduled_date}`;
    setSavingKey(key);
    try {
      await apiFetch('/maintenance/records', {
        method: 'POST',
        token,
        body: JSON.stringify({
          vehicle_id: item.vehicle_id,
          task_type: item.task_type,
          scheduled_date: item.scheduled_date,
          completed,
          notes: notes[key] || '',
        }),
      });
      toast.success(completed ? 'Checklist marcado como realizado.' : 'Checklist marcado como pendente.');
      await load(month);
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <AppLayout title="Calendário de manutenção recorrente">
      <section className="mb-6 grid gap-4 xl:grid-cols-[1.5fr,1fr]">
        <Card className="premium-card overflow-hidden border-border/70">
          <CardContent className="glass-panel p-6 md:p-8">
            <Badge variant="outline" className="mb-4 rounded-full border-info/30 bg-info/10 px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-info">
              Checklist recorrente da frota
            </Badge>
            <h2 className="max-w-3xl text-3xl font-semibold leading-tight md:text-4xl">
              Lubrificação semanal, preventiva semanal e limpeza quinzenal do ar-condicionado com histórico por veículo.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
              O fornecedor marca o que já foi feito, e a gestão acompanha imediatamente o que está pendente e o histórico do que foi executado.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Button variant="outline" className="rounded-full border-border/70 bg-card/70" onClick={() => setMonth((current) => shiftMonth(current, -1))}>
                <ChevronLeft className="h-4 w-4" />
                Mês anterior
              </Button>
              <div className="rounded-full border border-border/70 bg-card/80 px-4 py-2 text-sm font-medium capitalize">
                {getMonthLabel(month)}
              </div>
              <Button variant="outline" className="rounded-full border-border/70 bg-card/70" onClick={() => setMonth((current) => shiftMonth(current, 1))}>
                Próximo mês
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="premium-card border-border/70 bg-card/85">
          <CardHeader>
            <CardTitle className="text-lg">Resumo do período</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <SummaryCard label="Atividades previstas" value={summary.total} />
            <SummaryCard label="Realizadas" value={summary.done} tone="text-success" />
            <SummaryCard label="Pendentes" value={summary.pending} tone="text-warning" />
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.35fr,0.95fr]">
        <div className="space-y-6">
          {data?.weeks.map((week) => (
            <Card key={week.week_start} className="premium-card border-border/70 bg-card/85">
              <CardHeader>
                <CardTitle className="text-xl">Semana de {week.week_start}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {week.items.map((item) => {
                  const key = `${item.vehicle_id}-${item.task_type}-${item.scheduled_date}`;
                  const Icon = taskIcon(item.task_type);
                  return (
                    <div key={key} className="rounded-3xl border border-border/70 bg-background/80 p-5">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline" className="rounded-full border-border/70 bg-card px-3 py-1 text-xs">
                              {item.vehicle_plate}
                            </Badge>
                            <Badge className={`rounded-full px-3 py-1 text-xs ${item.completed ? 'bg-success/15 text-success' : 'bg-warning/15 text-warning'}`}>
                              {item.completed ? 'Realizado' : 'Pendente'}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4 text-primary" />
                            <p className="text-lg font-semibold">{item.task_label}</p>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {item.vehicle_model || 'Modelo não informado'} • Programado para {new Date(item.scheduled_date).toLocaleDateString('pt-BR')}
                          </p>
                          {item.completed_at ? (
                            <p className="text-xs text-muted-foreground">
                              Realizado em {new Date(item.completed_at).toLocaleString('pt-BR')}
                            </p>
                          ) : null}
                        </div>

                        <div className="w-full max-w-md space-y-3">
                          <Textarea
                            value={notes[key] || ''}
                            onChange={(e) => setNotes((current) => ({ ...current, [key]: e.target.value }))}
                            disabled={!canEdit}
                            placeholder={canEdit ? 'Observações da execução semanal.' : 'Sem observações registradas.'}
                            className="min-h-24 rounded-2xl border-border/70 bg-card/80"
                          />
                          {canEdit ? (
                            <div className="flex gap-3">
                              <Button
                                className="flex-1 rounded-2xl"
                                disabled={savingKey === key}
                                onClick={() => void saveItem(item, true)}
                              >
                                <CheckCheck className="h-4 w-4" />
                                Marcar realizado
                              </Button>
                              <Button
                                className="flex-1 rounded-2xl"
                                variant="outline"
                                disabled={savingKey === key}
                                onClick={() => void saveItem(item, false)}
                              >
                                Manter pendente
                              </Button>
                            </div>
                          ) : (
                            <div className="rounded-2xl border border-dashed border-border p-3 text-xs text-muted-foreground">
                              O fornecedor atualiza este checklist. A gestão acompanha o status e o histórico.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="premium-card border-border/70 bg-card/85">
          <CardHeader>
            <CardTitle className="text-xl">Histórico recente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data?.history.map((item) => (
              <div key={item.id} className="rounded-2xl border border-border/70 bg-background/80 p-4">
                <p className="font-medium">{item.vehicle_plate}</p>
                <p className="mt-1 text-sm text-muted-foreground">{item.task_type}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Programado para {new Date(item.scheduled_date).toLocaleDateString('pt-BR')}
                </p>
                <p className="text-xs text-muted-foreground">
                  Realizado em {item.completed_at ? new Date(item.completed_at).toLocaleString('pt-BR') : '-'}
                </p>
                {item.notes ? <p className="mt-2 text-xs text-foreground">{item.notes}</p> : null}
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </AppLayout>
  );
}

function SummaryCard({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-background/80 p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className={`mt-2 text-2xl font-semibold ${tone || ''}`}>{value}</p>
    </div>
  );
}
