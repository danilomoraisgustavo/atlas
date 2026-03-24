import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, Search } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuth, getApiErrorMessage } from '@/contexts/AuthContext';
import { apiFetch } from '@/api/client';
import type { ServiceOrder } from '@/types/app';
import { toast } from 'sonner';

function formatCurrency(value: number) {
  return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
}

export default function OrdersList() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    apiFetch<ServiceOrder[]>('/orders', { token })
      .then(setOrders)
      .catch((error) => toast.error(getApiErrorMessage(error)));
  }, [token]);

  const filtered = orders.filter((order) =>
    `${order.order_number} ${order.vehicle_plate} ${order.status} ${order.supplier_name}`.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <AppLayout title="Ordens de serviço">
      <Card className="premium-card border-border/70 bg-card/85">
        <CardHeader>
          <CardTitle className="text-xl">Consulta operacional</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filtrar por número, placa, fornecedor ou status"
              className="rounded-2xl border-border/70 bg-background/80 pl-11"
            />
          </div>

          <div className="grid gap-4">
            {filtered.map((order) => (
              <button
                key={order.id}
                type="button"
                onClick={() => navigate(`/ordens/${order.id}`)}
                className="group rounded-3xl border border-border/70 bg-background/80 p-5 text-left transition-all hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-lg hover:shadow-primary/5"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="rounded-full border-border/70 bg-card px-3 py-1 text-xs">
                        OS {order.order_number || order.id}
                      </Badge>
                      <Badge className="rounded-full bg-primary/15 px-3 py-1 text-xs text-primary">
                        {order.status}
                      </Badge>
                    </div>
                    <p className="text-lg font-semibold">{order.vehicle_plate || '-'}</p>
                    <p className="text-sm text-muted-foreground">
                      {order.supplier_name || 'Fornecedor não informado'} • {formatCurrency(order.total_value)}
                    </p>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="rounded-2xl bg-secondary/70 px-4 py-3 text-sm">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Confiança OCR</p>
                      <p className="mt-1 font-semibold">{Math.round((order.confidence || 0) * 100)}%</p>
                    </div>
                    <div className="flex items-center gap-2 text-sm font-medium text-primary">
                      Abrir ordem
                      <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                    </div>
                  </div>
                </div>
              </button>
            ))}
            {!filtered.length ? (
              <div className="rounded-3xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                Nenhuma ordem encontrada com esse filtro.
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </AppLayout>
  );
}
