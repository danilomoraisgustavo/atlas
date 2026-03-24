import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, FileText } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { API_BASE_URL, apiFetch } from '@/api/client';
import { useAuth, getApiErrorMessage } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface MeasurementRow {
  order_id: number;
  order_number: string;
  vehicle_plate: string;
  supplier_name: string;
  status: string;
  total_value: number;
  estimated_completion?: string | null;
}

interface MeasurementReport {
  url: string;
  total_ordens: number;
  total_valor: number;
  rows: MeasurementRow[];
  date_from?: string | null;
  date_to?: string | null;
}

function formatCurrency(value: number) {
  return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
}

export default function MeasurementPage() {
  const { token } = useAuth();
  const [report, setReport] = useState<MeasurementReport | null>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const loadReport = async (params?: { date_from?: string; date_to?: string }) => {
    try {
      const data = await apiFetch<MeasurementReport>('/orders/measurement/report', {
        token,
        params: {
          date_from: params?.date_from || '',
          date_to: params?.date_to || '',
        },
      });
      setReport(data);
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  };

  useEffect(() => {
    void loadReport();
  }, [token]);

  return (
    <AppLayout title="Boletim de medição">
      <Card className="premium-card border-border/70 bg-card/85">
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div>
            <CardTitle className="text-xl">Ordens aptas para medição</CardTitle>
            <p className="text-sm text-muted-foreground">Agora com visão detalhada das ordens e das evidências anexadas.</p>
          </div>
          {report ? (
            <Button asChild className="rounded-full">
              <a href={`${API_BASE_URL}${report.url}`} target="_blank" rel="noreferrer">
                <FileText className="h-4 w-4" />
                Abrir PDF do boletim
              </a>
            </Button>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-3 rounded-3xl border border-border/70 bg-background/80 p-4 md:grid-cols-[1fr,1fr,auto]">
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Data inicial</label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="rounded-2xl border-border/70 bg-card" />
            </div>
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Data final</label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="rounded-2xl border-border/70 bg-card" />
            </div>
            <div className="flex items-end gap-3">
              <Button className="rounded-2xl" onClick={() => void loadReport({ date_from: dateFrom, date_to: dateTo })}>
                Filtrar
              </Button>
              <Button
                variant="outline"
                className="rounded-2xl"
                onClick={() => {
                  setDateFrom('');
                  setDateTo('');
                  void loadReport();
                }}
              >
                Limpar
              </Button>
            </div>
          </div>

          {report ? (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-3xl border border-border/70 bg-background/80 p-5">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Total de ordens</p>
                  <p className="mt-2 text-3xl font-semibold">{report.total_ordens}</p>
                </div>
                <div className="rounded-3xl border border-border/70 bg-background/80 p-5">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Total consolidado</p>
                  <p className="mt-2 text-3xl font-semibold">{formatCurrency(report.total_valor)}</p>
                </div>
              </div>

              <div className="space-y-4">
                {report.rows.map((row) => (
                  <div key={row.order_id} className="rounded-3xl border border-border/70 bg-background/80 p-5">
                    <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className="rounded-full border-border/70 bg-card px-3 py-1 text-xs">
                            OS {row.order_number}
                          </Badge>
                          <Badge className="rounded-full bg-primary/15 px-3 py-1 text-xs text-primary">
                            {row.status}
                          </Badge>
                        </div>
                        <p className="mt-3 text-lg font-semibold">{row.vehicle_plate}</p>
                        <p className="text-sm text-muted-foreground">
                          {row.supplier_name} • {formatCurrency(row.total_value)}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Previsão informada: {row.estimated_completion ? new Date(row.estimated_completion).toLocaleString('pt-BR') : 'Não informada'}
                        </p>
                      </div>

                      <Button asChild variant="outline" className="rounded-full border-border/70 bg-card/80">
                        <Link to={`/ordens/${row.order_id}`}>
                          Abrir ordem
                          <ArrowUpRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>

                  </div>
                ))}
              </div>
            </>
          ) : null}
        </CardContent>
      </Card>
    </AppLayout>
  );
}
