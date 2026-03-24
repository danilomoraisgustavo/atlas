import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, ArrowRight, CircleDollarSign, ClipboardCheck, FileClock, Gauge, ShieldCheck, Wrench } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth, getApiErrorMessage } from '@/contexts/AuthContext';
import { apiFetch } from '@/api/client';
import type { DashboardMetrics, ServiceOrder } from '@/types/app';
import { toast } from 'sonner';

const labels: Record<string, string> = {
  aguardando_aprovacao: 'Aguardando aprovação',
  aprovada: 'Aprovadas',
  reprovada: 'Reprovadas',
  em_andamento: 'Em andamento',
  aguardando_validacao: 'Aguardando validação',
  concluida: 'Concluídas',
  retrabalho: 'Retrabalho',
  medicao: 'Medição',
};

const statusTone: Record<string, string> = {
  aguardando_aprovacao: 'bg-warning/15 text-warning',
  aprovada: 'bg-info/15 text-info',
  reprovada: 'bg-destructive/15 text-destructive',
  em_andamento: 'bg-primary/15 text-primary',
  aguardando_validacao: 'bg-warning/15 text-warning',
  concluida: 'bg-success/15 text-success',
  retrabalho: 'bg-destructive/15 text-destructive',
  medicao: 'bg-success/15 text-success',
};

function formatCurrency(value: number) {
  return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
}

export default function Dashboard() {
  const { token, user } = useAuth();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [dashboard, latestOrders] = await Promise.all([
          apiFetch<DashboardMetrics>('/orders/dashboard', { token }),
          apiFetch<ServiceOrder[]>('/orders', { token }),
        ]);
        setMetrics(dashboard);
        setOrders(latestOrders.slice(0, 6));
      } catch (error) {
        toast.error(getApiErrorMessage(error));
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [token]);

  const heroStats = useMemo(() => {
    if (!metrics) return [];

    return [
      { label: 'Ordens totais', value: metrics.total_ordens, icon: FileClock, detail: 'Visão consolidada da operação' },
      { label: 'Valor em carteira', value: formatCurrency(metrics.total_valor), icon: CircleDollarSign, detail: 'Custo total acumulado' },
      { label: 'Aguardando validação', value: metrics.aguardando_validacao, icon: ClipboardCheck, detail: 'Prontas para conferência final' },
      { label: 'Aptas para medição', value: metrics.aptas_medicao, icon: Gauge, detail: 'Ordens liberadas para medição' },
    ];
  }, [metrics]);

  return (
    <AppLayout title="Dashboard do gestor">
      <section className="mb-6 grid gap-4 xl:grid-cols-[1.6fr,1fr]">
        <Card className="premium-card overflow-hidden border-border/70">
          <CardContent className="glass-panel relative p-6 md:p-8">
            <div className="absolute inset-y-0 right-0 hidden w-1/3 bg-[radial-gradient(circle_at_center,hsl(37_100%_70%_/_0.22),transparent_65%)] lg:block" />
            <div className="relative max-w-2xl">
              <Badge variant="outline" className="mb-4 rounded-full border-warning/30 bg-warning/10 px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-warning">
                Controle premium de manutenção
              </Badge>
              <h2 className="text-3xl font-semibold leading-tight md:text-4xl">Gestão mais clara, rápida e confiável para aprovação e medição.</h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground md:text-base">
                Centralize as decisões do gestor com visão financeira, fila de validação e status operacional em uma interface mais limpa e profissional.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button asChild className="rounded-full px-5">
                  <Link to="/ordens">
                    Ver ordens
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" className="rounded-full border-border/70 bg-card/70 px-5">
                  <Link to="/medicao">Abrir medição</Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="premium-card border-border/70 bg-card/85">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Resumo executivo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="rounded-2xl bg-secondary/70 p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Usuário ativo</p>
              <p className="mt-2 text-lg font-semibold">{user?.name || 'Gestor'}</p>
              <p className="text-muted-foreground">Painel de decisão e acompanhamento operacional</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <div className="rounded-2xl border border-border/70 p-4">
                <div className="mb-2 flex items-center gap-2 text-primary">
                  <ShieldCheck className="h-4 w-4" />
                  <span className="text-xs uppercase tracking-[0.18em]">Governança</span>
                </div>
                <p className="font-medium">Acompanhe aprovações, retrabalhos e auditoria sem perder contexto.</p>
              </div>
              <div className="rounded-2xl border border-border/70 p-4">
                <div className="mb-2 flex items-center gap-2 text-warning">
                  <Activity className="h-4 w-4" />
                  <span className="text-xs uppercase tracking-[0.18em]">Ritmo</span>
                </div>
                <p className="font-medium">Os gargalos mais urgentes aparecem primeiro para acelerar a tomada de decisão.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {loading ? <p className="mb-4 text-sm text-muted-foreground">Carregando indicadores...</p> : null}

      {metrics ? (
        <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {heroStats.map((stat) => (
            <Card key={stat.label} className="premium-card border-border/70 bg-card/85">
              <CardContent className="p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                    <stat.icon className="h-5 w-5" />
                  </div>
                  <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Ao vivo</span>
                </div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="mt-2 text-3xl font-semibold">{stat.value}</p>
                <p className="mt-2 text-xs text-muted-foreground">{stat.detail}</p>
              </CardContent>
            </Card>
          ))}
        </section>
      ) : null}

      {metrics ? (
        <section className="mb-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Mapa de status</h3>
              <p className="text-sm text-muted-foreground">Distribuição atual das ordens dentro do fluxo operacional.</p>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {Object.entries(labels).map(([key, label]) => (
              <Card key={key} className="premium-card border-border/70 bg-card/80">
                <CardContent className="flex items-center justify-between p-5">
                  <div>
                    <p className="text-sm text-muted-foreground">{label}</p>
                    <p className="mt-1 text-2xl font-semibold">{metrics[key as keyof DashboardMetrics] || 0}</p>
                  </div>
                  <span className={`status-dot ${statusTone[key]}`} />
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      <Card className="premium-card border-border/70 bg-card/85">
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div>
            <CardTitle className="text-xl">Ordens recentes</CardTitle>
            <p className="text-sm text-muted-foreground">As últimas movimentações para aprovação, validação e medição.</p>
          </div>
          <Button asChild variant="outline" className="rounded-full border-border/70 bg-card/70">
            <Link to="/ordens">Ver todas</Link>
          </Button>
        </CardHeader>
        <CardContent className="grid gap-4">
          {orders.map((order) => (
            <Link
              key={order.id}
              to={`/ordens/${order.id}`}
              className="group rounded-3xl border border-border/70 bg-background/80 p-5 transition-all hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-lg hover:shadow-primary/5"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="rounded-full border-border/70 bg-card px-3 py-1 text-xs">
                      OS {order.order_number || order.id}
                    </Badge>
                    <Badge className={`rounded-full px-3 py-1 text-xs ${statusTone[order.status] || 'bg-secondary text-secondary-foreground'}`}>
                      {labels[order.status] || order.status}
                    </Badge>
                  </div>
                  <p className="text-lg font-semibold">{order.vehicle_plate || 'Veículo não identificado'}</p>
                  <p className="text-sm text-muted-foreground">
                    Fornecedor: {order.supplier_name || '-'} • Total: {formatCurrency(order.total_value)}
                  </p>
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <div className="rounded-2xl bg-secondary/80 px-4 py-2">
                    <p className="text-[11px] uppercase tracking-[0.18em]">Confiança OCR</p>
                    <p className="mt-1 font-semibold text-foreground">{Math.round((order.confidence || 0) * 100)}%</p>
                  </div>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            </Link>
          ))}
          {!orders.length && !loading ? (
            <div className="rounded-3xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              Nenhuma ordem recente encontrada.
            </div>
          ) : null}
        </CardContent>
      </Card>
    </AppLayout>
  );
}
