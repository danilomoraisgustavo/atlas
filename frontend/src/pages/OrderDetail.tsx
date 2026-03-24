import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ArrowUpRight, Camera, CheckCircle2, ClipboardCheck, FileImage, FileText, Hammer, MessageSquareWarning, ShieldCheck, Video } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useAuth, getApiErrorMessage } from '@/contexts/AuthContext';
import { API_BASE_URL, apiFetch } from '@/api/client';
import type { OrderAttachment, ServiceOrder } from '@/types/app';
import { toast } from 'sonner';

async function sendEvidence(token: string | null, orderId: number, category: string, itemId: number, file: File) {
  const form = new FormData();
  form.append('category', category);
  form.append('item_id', String(itemId));
  form.append('file', file);
  return apiFetch(`/orders/${orderId}/attachments`, { method: 'POST', body: form, token });
}

function formatCurrency(value: number) {
  return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
}

function toDateTimeLocal(value: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (part: number) => String(part).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function OrderDetail() {
  const { id } = useParams();
  const orderId = Number(id);
  const { token, user } = useAuth();
  const [order, setOrder] = useState<ServiceOrder | null>(null);
  const [justification, setJustification] = useState('');
  const [estimatedCompletion, setEstimatedCompletion] = useState('');
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const canManage = user?.role !== 'fornecedor';

  const loadOrder = async () => {
    try {
      const data = await apiFetch<ServiceOrder>(`/orders/${orderId}`, { token });
      setOrder(data);
      setEstimatedCompletion((current) => current || toDateTimeLocal(data.estimated_completion));
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  };

  useEffect(() => {
    if (orderId) void loadOrder();
  }, [orderId, token]);

  const grouped = useMemo(() => {
    const before = new Map<number, OrderAttachment[]>();
    const after = new Map<number, OrderAttachment[]>();
    order?.attachments.forEach((attachment) => {
      if (!attachment.item_id) return;
      if (attachment.category === 'before') before.set(attachment.item_id, [...(before.get(attachment.item_id) || []), attachment]);
      if (attachment.category === 'after') after.set(attachment.item_id, [...(after.get(attachment.item_id) || []), attachment]);
    });
    return { before, after };
  }, [order]);

  const progress = useMemo(() => {
    if (!order?.items.length) return 0;
    const complete = order.items.filter((item) => {
      const beforeComplete = (grouped.before.get(item.id)?.length || 0) >= item.need_evidence_count;
      const afterComplete = (grouped.after.get(item.id)?.length || 0) >= item.done_evidence_count;
      return beforeComplete && afterComplete;
    }).length;
    return Math.round((complete / order.items.length) * 100);
  }, [grouped.after, grouped.before, order]);

  const afterEvidenceComplete = useMemo(() => {
    if (!order?.items.length) return false;
    return order.items.every((item) => (grouped.after.get(item.id)?.length || 0) >= item.done_evidence_count);
  }, [grouped.after, order]);

  const action = async (path: string, body?: Record<string, unknown>) => {
    try {
      await apiFetch(`/orders/${orderId}/${path}`, { method: 'POST', token, body: JSON.stringify(body || {}) });
      toast.success('Operação concluída com sucesso.');
      setJustification('');
      await loadOrder();
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  };

  const handleAttachmentUpload = async (itemId: number, category: 'before' | 'after', file: File | null) => {
    if (!order || !file) return;
    const key = `${category}-${itemId}`;
    setUploadingKey(key);
    try {
      await sendEvidence(token, order.id, category, itemId, file);
      toast.success(category === 'before' ? 'Evidência inicial enviada.' : 'Evidência final enviada.');
      await loadOrder();
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setUploadingKey(null);
    }
  };

  if (!order) {
    return (
      <AppLayout title="Detalhe da ordem">
        <p className="text-sm text-muted-foreground">Carregando ordem...</p>
      </AppLayout>
    );
  }

  return (
    <AppLayout title={`Ordem ${order.order_number || order.id}`}>
      <div className="grid gap-6 xl:grid-cols-[1.45fr,0.95fr]">
        <div className="space-y-6">
          <Card className="premium-card overflow-hidden border-border/70">
            <CardContent className="glass-panel p-6 md:p-8">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="rounded-full border-border/70 bg-card px-3 py-1 text-xs">
                      OS {order.order_number || order.id}
                    </Badge>
                    <Badge className="rounded-full bg-primary/15 px-3 py-1 text-xs text-primary">{order.status}</Badge>
                  </div>
                  <h2 className="text-3xl font-semibold">{order.vehicle_plate || 'Veículo não identificado'}</h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                    Fornecedor {order.supplier_name || '-'} • Total {formatCurrency(order.total_value)} • Medição {order.measurement_status}
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-border/70 bg-card/80 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Confiança OCR</p>
                    <p className="mt-2 text-xl font-semibold">{Math.round(order.confidence * 100)}%</p>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-card/80 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Itens</p>
                    <p className="mt-2 text-xl font-semibold">{order.items.length}</p>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-card/80 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Evidências</p>
                    <p className="mt-2 text-xl font-semibold">{progress}%</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="premium-card border-border/70 bg-card/85">
            <CardHeader>
              <CardTitle className="text-xl">Dados principais</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 text-sm md:grid-cols-2">
              <InfoCard label="Status" value={order.status} />
              <InfoCard label="Fornecedor" value={order.supplier_name || '-'} />
              <InfoCard label="Placa" value={order.vehicle_plate || '-'} />
              <InfoCard label="Total" value={formatCurrency(order.total_value)} />
              <InfoCard
                label="Previsão de conclusão"
                value={order.estimated_completion ? new Date(order.estimated_completion).toLocaleString('pt-BR') : 'Não informada'}
              />
              <a
                href={order.original_file_path ? `${API_BASE_URL}${order.original_file_path}` : '#'}
                target="_blank"
                rel="noreferrer"
                className="rounded-2xl border border-border/70 p-4 transition-colors hover:border-primary/35 hover:bg-background/80"
              >
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Documento original da OS</p>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">Abrir ordem de serviço enviada</p>
                    <p className="text-xs text-muted-foreground">Visualize o PDF ou a imagem original anexada na leitura.</p>
                  </div>
                  <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </div>
              </a>
              <div className="rounded-2xl border border-border/70 p-4 md:col-span-2">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Observações</p>
                <p className="mt-2 text-muted-foreground">{order.observations || '-'}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="premium-card border-border/70 bg-card/85">
            <CardHeader>
              <CardTitle className="text-xl">Itens e evidências</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {order.items.map((item) => {
                const beforeAttachments = grouped.before.get(item.id) || [];
                const afterAttachments = grouped.after.get(item.id) || [];
                const beforeComplete = beforeAttachments.length >= item.need_evidence_count;
                const afterComplete = afterAttachments.length >= item.done_evidence_count;

                return (
                  <div key={item.id} className="rounded-3xl border border-border/70 bg-background/80 p-5">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className="rounded-full border-border/70 bg-card px-3 py-1 text-xs">
                            {item.item_type}
                          </Badge>
                          <Badge className={`rounded-full px-3 py-1 text-xs ${beforeComplete ? 'bg-success/15 text-success' : 'bg-warning/15 text-warning'}`}>
                            Antes {beforeAttachments.length}/{item.need_evidence_count}
                          </Badge>
                          <Badge className={`rounded-full px-3 py-1 text-xs ${afterComplete ? 'bg-success/15 text-success' : 'bg-warning/15 text-warning'}`}>
                            Depois {afterAttachments.length}/{item.done_evidence_count}
                          </Badge>
                        </div>
                        <p className="text-lg font-semibold">{item.description}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.quantity} {item.unit} • {formatCurrency(item.total_price)} • Código {item.item_code || 'não informado'}
                        </p>
                      </div>

                      <div className="grid w-full max-w-3xl gap-4 lg:grid-cols-2">
                        <EvidenceBlock
                          title="Necessidade do serviço"
                          tone="text-primary"
                          attachments={beforeAttachments}
                          emptyLabel="Nenhuma evidência inicial enviada."
                          canUpload={!canManage}
                          inputKey={`before-${item.id}`}
                          uploadingKey={uploadingKey}
                          onUpload={(file) => void handleAttachmentUpload(item.id, 'before', file)}
                        />
                        <EvidenceBlock
                          title="Serviço realizado"
                          tone="text-success"
                          attachments={afterAttachments}
                          emptyLabel="Nenhuma evidência final enviada."
                          canUpload={!canManage}
                          inputKey={`after-${item.id}`}
                          uploadingKey={uploadingKey}
                          onUpload={(file) => void handleAttachmentUpload(item.id, 'after', file)}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card className="premium-card border-border/70 bg-card/85">
            <CardHeader>
              <CardTitle className="text-xl">Anexos gerais</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              {order.attachments.map((attachment) => (
                <a
                  key={attachment.id}
                  href={`${API_BASE_URL}${attachment.file_path}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between rounded-2xl border border-border/70 bg-background/80 p-4 transition-colors hover:border-primary/35"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{attachment.file_name || attachment.file_path.split('/').pop()}</p>
                    <p className="text-xs text-muted-foreground">{attachment.category} • {attachment.media_type}</p>
                  </div>
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                </a>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="premium-card border-border/70 bg-card/85">
            <CardHeader>
              <CardTitle className="text-xl">Ações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {canManage ? (
                <>
                  <Button className="w-full rounded-2xl" onClick={() => action('approve')}>
                    <ShieldCheck className="h-4 w-4" />
                    Aprovar OS
                  </Button>
                  <Button className="w-full rounded-2xl" variant="secondary" onClick={() => action('validate')}>
                    <ClipboardCheck className="h-4 w-4" />
                    Validar serviço
                  </Button>
                  <Button className="w-full rounded-2xl" variant="outline" onClick={() => action('send-to-measurement')}>
                    <Hammer className="h-4 w-4" />
                    Enviar para medição
                  </Button>
                  <Textarea
                    value={justification}
                    onChange={(e) => setJustification(e.target.value)}
                    placeholder="Justificativa para reprovação ou retrabalho"
                    className="min-h-28 rounded-2xl border-border/70 bg-background/80"
                  />
                  <Button className="w-full rounded-2xl" variant="destructive" onClick={() => action('reject', { justification })}>
                    Reprovar
                  </Button>
                  <Button className="w-full rounded-2xl" variant="outline" onClick={() => action('rework', { justification })}>
                    <MessageSquareWarning className="h-4 w-4" />
                    Solicitar retrabalho
                  </Button>
                </>
              ) : (
                <>
                  <div className="rounded-2xl border border-border/70 bg-background/80 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Início do serviço</p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Após a aprovação do gestor, informe a previsão de conclusão antes de iniciar.
                    </p>
                    <Input
                      type="datetime-local"
                      value={estimatedCompletion}
                      onChange={(e) => setEstimatedCompletion(e.target.value)}
                      className="mt-3 rounded-2xl border-border/70 bg-card"
                    />
                    <Button
                      className="mt-3 w-full rounded-2xl"
                      onClick={() => action('start', { estimated_completion: estimatedCompletion })}
                    >
                      Iniciar serviço
                    </Button>
                  </div>

                  <Textarea
                    value={justification}
                    onChange={(e) => setJustification(e.target.value)}
                    placeholder="Observação de conclusão"
                    className="min-h-28 rounded-2xl border-border/70 bg-background/80"
                  />
                  <Button
                    className="w-full rounded-2xl"
                    variant="secondary"
                    disabled={!afterEvidenceComplete}
                    onClick={() => action('finish', { justification })}
                  >
                    Concluir serviço
                  </Button>
                  {!afterEvidenceComplete ? (
                    <p className="text-xs text-warning">
                      Envie todas as fotos dos serviços realizados antes de finalizar.
                    </p>
                  ) : null}
                </>
              )}
            </CardContent>
          </Card>

          <Card className="premium-card border-border/70 bg-card/85">
            <CardHeader>
              <CardTitle className="text-xl">Auditoria</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              {order.audit_logs.map((log) => (
                <div key={log.id} className="rounded-2xl border border-border/70 bg-background/80 p-4">
                  <p className="font-medium">{log.action}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{new Date(log.timestamp).toLocaleString('pt-BR')} • {log.user_name}</p>
                  {log.details ? <p className="mt-2 text-xs text-muted-foreground">{log.details}</p> : null}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/70 p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-2 font-semibold">{value}</p>
    </div>
  );
}

function EvidenceBlock({
  title,
  tone,
  attachments,
  emptyLabel,
  canUpload,
  inputKey,
  uploadingKey,
  onUpload,
}: {
  title: string;
  tone: string;
  attachments: OrderAttachment[];
  emptyLabel: string;
  canUpload: boolean;
  inputKey: string;
  uploadingKey: string | null;
  onUpload: (file: File | null) => void;
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card/70 p-4">
      <div className={`mb-3 flex items-center gap-2 ${tone}`}>
        <Camera className="h-4 w-4" />
        <span className="text-xs uppercase tracking-[0.18em]">{title}</span>
      </div>
      {canUpload ? (
        <input
          type="file"
          accept="image/*,video/*"
          className="w-full rounded-2xl border border-border/70 bg-background/80 px-3 py-2 text-sm"
          disabled={uploadingKey === inputKey}
          onChange={(e) => {
            const file = e.target.files?.[0] || null;
            onUpload(file);
            e.currentTarget.value = '';
          }}
        />
      ) : (
        <div className="rounded-2xl border border-dashed border-border p-3 text-xs text-muted-foreground">
          Somente o fornecedor pode enviar arquivos nesta etapa.
        </div>
      )}
      <div className="mt-3 grid grid-cols-2 gap-2">
        {attachments.map((attachment) => (
          <EvidencePreview key={attachment.id} attachment={attachment} />
        ))}
        {!attachments.length ? (
          <div className="col-span-2 rounded-2xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
            {emptyLabel}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function EvidencePreview({ attachment }: { attachment: OrderAttachment }) {
  return (
    <a
      href={`${API_BASE_URL}${attachment.file_path}`}
      target="_blank"
      rel="noreferrer"
      className="group overflow-hidden rounded-2xl border border-border/70 bg-card"
    >
      <div className="aspect-[4/3] bg-muted">
        {attachment.media_type === 'image' ? (
          <img src={`${API_BASE_URL}${attachment.file_path}`} alt={attachment.file_name} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
        ) : attachment.media_type === 'video' ? (
          <video src={`${API_BASE_URL}${attachment.file_path}`} className="h-full w-full object-cover" muted />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            {attachment.media_type === 'video' ? <Video className="h-5 w-5" /> : <FileImage className="h-5 w-5" />}
          </div>
        )}
      </div>
      <div className="truncate p-2 text-[11px] text-muted-foreground">{attachment.file_name}</div>
    </a>
  );
}
