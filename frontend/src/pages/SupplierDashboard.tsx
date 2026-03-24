import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Camera, CircleDollarSign, Clock3, FileSearch, FileUp, ListTodo, TriangleAlert } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth, getApiErrorMessage } from '@/contexts/AuthContext';
import { apiFetch } from '@/api/client';
import type { DashboardMetrics, ServiceOrder } from '@/types/app';
import { toast } from 'sonner';

function formatCurrency(value: number) {
  return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
}

export default function SupplierDashboard() {
  const { token, user } = useAuth();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [orders, setOrders] = useState<ServiceOrder[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const [dashboard, supplierOrders] = await Promise.all([
          apiFetch<DashboardMetrics>('/orders/dashboard', { token }),
          apiFetch<ServiceOrder[]>('/orders', { token }),
        ]);
        setMetrics(dashboard);
        setOrders(supplierOrders);
      } catch (error) {
        toast.error(getApiErrorMessage(error));
      }
    }

    load();
  }, [token]);

  const pendingApproval = orders.filter((order) => order.status === 'aguardando_aprovacao').length;
  const needsAction = orders.filter((order) => ['aprovada', 'retrabalho', 'aguardando_validacao'].includes(order.status)).slice(0, 4);

  const cards = useMemo(() => {
    if (!metrics) return [];
    return [
      { label: 'Ordens enviadas', value: metrics.total_ordens, icon: FileUp, detail: 'Documentos e leituras já processados' },
      { label: 'Aguardando aprovação', value: pendingApproval, icon: Clock3, detail: 'Em análise pelo gestor' },
      { label: 'Em execução', value: metrics.em_andamento + metrics.retrabalho, icon: ListTodo, detail: 'Ordens que pedem ação da oficina' },
      { label: 'Valor total', value: formatCurrency(metrics.total_valor), icon: CircleDollarSign, detail: 'Carteira atual do fornecedor' },
    ];
  }, [metrics, pendingApproval]);

  return (
    <AppLayout title="Painel do fornecedor">
      <section className="mb-6 grid gap-4 xl:grid-cols-[1.5fr,1fr]">
        <Card className="premium-card overflow-hidden border-border/70">
          <CardContent className="glass-panel p-6 md:p-8">
            <Badge variant="outline" className="mb-4 rounded-full border-info/30 bg-info/10 px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-info">
              Jornada guiada da oficina
            </Badge>
            <h2 className="max-w-2xl text-3xl font-semibold leading-tight md:text-4xl">
              Envie a OS, revise os itens e anexe foto por item antes de mandar para aprovação.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
              A nova experiência do fornecedor deixa o processo mais visual e orientado, reduz retrabalho e dá mais confiança na validação do gestor.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild className="rounded-full px-5">
                <Link to="/fornecedor/nova">
                  Nova ordem
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="rounded-full border-border/70 bg-card/70 px-5">
                <Link to="/ordens">Minhas ordens</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="premium-card border-border/70 bg-card/85">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Rotina operacional</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="rounded-2xl bg-secondary/70 p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Fornecedor logado</p>
              <p className="mt-2 text-lg font-semibold">{user?.name || 'Fornecedor'}</p>
              <p className="text-muted-foreground">Mantenha cada item com evidência completa para evitar devoluções.</p>
            </div>
            <div className="rounded-2xl border border-border/70 p-4">
              <div className="mb-2 flex items-center gap-2 text-primary">
                <Camera className="h-4 w-4" />
                <span className="text-xs uppercase tracking-[0.18em]">Regra ativa</span>
              </div>
              <p className="font-medium">Cada item precisa de foto comprobatória antes do envio para revisão do gestor.</p>
            </div>
            <div className="rounded-2xl border border-warning/30 bg-warning/10 p-4">
              <div className="mb-2 flex items-center gap-2 text-warning">
                <TriangleAlert className="h-4 w-4" />
                <span className="text-xs uppercase tracking-[0.18em]">Atenção</span>
              </div>
              <p className="font-medium">Fotos faltantes impedem o avanço da OS para aprovação.</p>
            </div>
          </CardContent>
        </Card>
      </section>

      {metrics ? (
        <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => (
            <Card key={card.label} className="premium-card border-border/70 bg-card/85">
              <CardContent className="p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                    <card.icon className="h-5 w-5" />
                  </div>
                  <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Fornecedor</span>
                </div>
                <p className="text-sm text-muted-foreground">{card.label}</p>
                <p className="mt-2 text-3xl font-semibold">{card.value}</p>
                <p className="mt-2 text-xs text-muted-foreground">{card.detail}</p>
              </CardContent>
            </Card>
          ))}
        </section>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[1.25fr,0.95fr]">
        <Card className="premium-card border-border/70 bg-card/85">
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <div>
              <CardTitle className="text-xl">Fila de trabalho</CardTitle>
              <p className="text-sm text-muted-foreground">Ordens que precisam de ação imediata da equipe do fornecedor.</p>
            </div>
            <Button asChild variant="outline" className="rounded-full border-border/70 bg-card/70">
              <Link to="/ordens">Ver todas</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {needsAction.map((order) => (
              <Link
                key={order.id}
                to={`/ordens/${order.id}`}
                className="group flex flex-col gap-3 rounded-3xl border border-border/70 bg-background/80 p-5 transition-all hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-lg hover:shadow-primary/5"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold">OS {order.order_number || order.id}</p>
                    <p className="text-sm text-muted-foreground">{order.vehicle_plate || 'Veículo não identificado'}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="rounded-full border-border/70 bg-card px-3 py-1 text-xs">
                    {order.status}
                  </Badge>
                  <Badge variant="outline" className="rounded-full border-border/70 bg-card px-3 py-1 text-xs">
                    {formatCurrency(order.total_value)}
                  </Badge>
                </div>
              </Link>
            ))}
            {!needsAction.length ? (
              <div className="rounded-3xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                Nenhuma ordem pendente de ação imediata.
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="premium-card border-border/70 bg-card/85">
          <CardHeader>
            <CardTitle className="text-xl">Como trabalhar melhor</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="rounded-2xl border border-border/70 p-4">
              <div className="mb-2 flex items-center gap-2 text-info">
                <FileSearch className="h-4 w-4" />
                <span className="text-xs uppercase tracking-[0.18em]">1. Leia a OS</span>
              </div>
              <p>Faça o upload do documento e revise os itens extraídos antes de confirmar a leitura.</p>
            </div>
            <div className="rounded-2xl border border-border/70 p-4">
              <div className="mb-2 flex items-center gap-2 text-warning">
                <Camera className="h-4 w-4" />
                <span className="text-xs uppercase tracking-[0.18em]">2. Comprove por item</span>
              </div>
              <p>Adicione a foto da necessidade do serviço em cada item para liberar o envio à aprovação.</p>
            </div>
            <div className="rounded-2xl border border-border/70 p-4">
              <div className="mb-2 flex items-center gap-2 text-success">
                <ListTodo className="h-4 w-4" />
                <span className="text-xs uppercase tracking-[0.18em]">3. Execute e conclua</span>
              </div>
              <p>Depois da aprovação, mantenha as evidências finais completas para concluir sem retrabalho.</p>
            </div>
          </CardContent>
        </Card>
      </section>
    </AppLayout>
  );
}
