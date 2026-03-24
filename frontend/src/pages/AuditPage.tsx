import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth, getApiErrorMessage } from '@/contexts/AuthContext';
import { apiFetch } from '@/api/client';
import { toast } from 'sonner';

interface AuditEntry {
  id: number;
  order_id?: number | null;
  user_name: string;
  action: string;
  previous_status?: string | null;
  new_status?: string | null;
  details?: string;
  timestamp: string;
}

interface AuditResponse {
  items: AuditEntry[];
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

export default function AuditPage() {
  const { token } = useAuth();
  const [data, setData] = useState<AuditResponse | null>(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    apiFetch<AuditResponse>('/admin/audit', { token, params: { page, page_size: 10 } })
      .then(setData)
      .catch((error) => toast.error(getApiErrorMessage(error)));
  }, [page, token]);

  return (
    <AppLayout title="Auditoria">
      <Card className="premium-card border-border/70 bg-card/85">
        <CardHeader>
          <CardTitle className="text-xl">Trilha operacional</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          {data?.items.map((entry) => (
            <div key={entry.id} className="rounded-3xl border border-border/70 bg-background/80 p-4">
              <p className="font-medium">{entry.action}</p>
              <p className="mt-1 text-xs text-muted-foreground">{entry.user_name} • {new Date(entry.timestamp).toLocaleString('pt-BR')}</p>
              <p className="mt-1 text-xs">OS: {entry.order_id || '-'} • {entry.previous_status || '-'} → {entry.new_status || '-'}</p>
              {entry.details ? <p className="mt-2">{entry.details}</p> : null}
            </div>
          ))}

          {data ? (
            <div className="flex flex-col gap-3 border-t border-border/70 pt-4 md:flex-row md:items-center md:justify-between">
              <p className="text-xs text-muted-foreground">
                Página {data.page} de {Math.max(data.total_pages, 1)} • {data.total} registros
              </p>
              <div className="flex gap-3">
                <Button variant="outline" className="rounded-2xl" disabled={data.page <= 1} onClick={() => setPage((current) => current - 1)}>
                  Anterior
                </Button>
                <Button variant="outline" className="rounded-2xl" disabled={data.page >= data.total_pages} onClick={() => setPage((current) => current + 1)}>
                  Próxima
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </AppLayout>
  );
}
