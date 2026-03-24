import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth, getApiErrorMessage } from '@/contexts/AuthContext';
import { API_BASE_URL, apiFetch } from '@/api/client';
import type { NotificationItem } from '@/types/app';
import { toast } from 'sonner';

export default function NotificationsPage() {
  const { token, user } = useAuth();
  const [items, setItems] = useState<NotificationItem[]>([]);

  useEffect(() => {
    apiFetch<NotificationItem[]>('/notifications', { token }).then(setItems).catch((error) => toast.error(getApiErrorMessage(error)));
  }, [token]);

  useEffect(() => {
    if (!user) return;
    const wsUrl = API_BASE_URL.replace('http', 'ws') + `/notifications/ws/${user.id}`;
    const socket = new WebSocket(wsUrl);
    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        setItems((current) => [{ ...payload, created_at: new Date().toISOString(), read: false }, ...current]);
        toast.success(payload.title || 'Nova notificação');
      } catch {
        // noop
      }
    };
    return () => socket.close();
  }, [user]);

  return (
    <AppLayout title="Notificações">
      <Card>
        <CardHeader><CardTitle>Alertas em tempo real</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="rounded border p-4">
              <p className="font-medium">{item.title}</p>
              <p className="text-sm mt-1">{item.message}</p>
              <p className="text-xs text-muted-foreground mt-2">{item.created_at ? new Date(item.created_at).toLocaleString('pt-BR') : ''}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </AppLayout>
  );
}
