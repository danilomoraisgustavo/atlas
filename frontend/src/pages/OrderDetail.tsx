import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ArrowUpRight, Camera, ClipboardCheck, FileImage, FileText, Hammer, MessageSquareWarning, ShieldCheck, Video } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useAuth, getApiErrorMessage } from '@/contexts/AuthContext';
import { API_BASE_URL, apiFetch } from '@/api/client';
import type { OrderAttachment, ServiceOrder, ServiceOrderItem } from '@/types/app';
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

function isApprovedForExecution(item: ServiceOrderItem) {
  return item.approval_status !== 'devolvido';
}

function getApprovalBadge(item: ServiceOrderItem) {
  if (item.approval_status === 'aprovado') {
    return { label: 'Item aprovado', className: 'bg-success/15 text-success' };
  }
  if (item.approval_status === 'devolvido') {
    return { label: 'Devolvido ao fornecedor', className: 'bg-destructive/15 text-destructive' };
  }
  return { label: 'Aguardando decisão', className: 'bg-warning/15 text-warning' };
}

export default function OrderDetail() {
  const { id } = useParams();
  const orderId = Number(id);
  const { token, user } = useAuth();
  const [order, setOrder] = useState<ServiceOrder | null>(null);
  const [justification, setJustification] = useState('');
  const [estimatedCompletion, setEstimatedCompletion] = useState('');
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<Record<number, boolean>>({});
  const [returnedReasons, setReturnedReasons] = useState<Record<number, string>>({});
  const canManage = user?.role !== 'fornecedor';

  const syncApprovalState = (data: ServiceOrder) => {
    setSelectedItems(() => Object.fromEntries(data.items.map((item) => [item.id, item.approval_status !== 'devolvido'])));
    setReturnedReasons(() =>
      Object.fromEntries(data.items.filter((item) => item.approval_reason).map((item) => [item.id, item.approval_reason || ''])),
    );
  };

  const loadOrder = async () => {
    try {
      const data = await apiFetch<ServiceOrder>(`/orders/${orderId}`, { token });
      setOrder(data);
      syncApprovalState(data);
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

  const executableItems = useMemo(() => {
    if (!order?.items.length) return [];
    const approved = order.items.filter((item) => isApprovedForExecution(item));
    return approved.length ? approved : order.items;
  }, [order]);

  const progress = useMemo(() => {
    if (!executableItems.length) return 0;
    const complete = executableItems.filter((item) => {
      const beforeComplete = (grouped.before.get(item.id)?.length || 0) >= item.need_evidence_count;
      const afterComplete = (grouped.after.get(item.id)?.length || 0) >= item.done_evidence_count;
      return beforeComplete && afterComplete;
    }).length;
    return Math.round((complete / executableItems.length) * 100);
  }, [executableItems, grouped.after, grouped.before]);

  const afterEvidenceComplete = useMemo(() => {
    if (!executableItems.length) return false;
    return executableItems.every((item) => (grouped.after.get(item.id)?.length || 0) >= item.done_evidence_count);
  }, [executableItems, grouped.after]);

  const partialApprovalSummary = useMemo(() => {
    if (!order) return { approvedIds: [] as number[], returnedItems: [] as Array<{ item_id: number; reason: string }>, valid: false, isPartial: false };

    const approvedIds = order.items.filter((item) => selectedItems[item.id]).map((item) => item.id);
    const returnedItems = order.items
      .filter((item) => !selectedItems[item.id])
      .map((item) => ({ item_id: item.id, reason: (returnedReasons[item.id] || '').trim() }));
    const isPartial = approvedIds.length > 0 && returnedItems.length > 0;
    const valid = isPartial && returnedItems.every((item) => item.reason.length > 0);
    return { approvedIds, returnedItems, valid, isPartial };
  }, [order, returnedReasons, selectedItems]);

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

  const handlePartialApproval = async () => {
    if (!partialApprovalSummary.valid) {
      toast.error('Selecione os itens aprovados e informe o motivo dos itens devolvidos.');
      return;
    }

    await action('approve', {
      approved_item_ids: partialApprovalSummary.approvedIds,
      returned_items: partialApprovalSummary.returnedItems,
    });
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
                const approvalBadge = getApprovalBadge(item);
                const executable = isApprovedForExecution(item);
                const manageApproval = canManage && order.status === 'aguardando_aprovacao';

                return (
                  <div key={item.id} className="rounded-3xl border border-border/70 bg-background/80 p-5">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div className="space-y-3 xl:max-w-xl">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className="rounded-full border-border/70 bg-card px-3 py-1 text-xs">
                            {item.item_type}
                          </Badge>
                          <Badge className={`rounded-full px-3 py-1 text-xs ${approvalBadge.className}`}>{approvalBadge.label}</Badge>
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
                        {item.service_execution_description ? (
                          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-3 text-sm">
                            <p className="font-medium text-primary">Descrição informada pelo fornecedor</p>
                            <p className="mt-1 text-muted-foreground">{item.service_execution_description}</p>
                          </div>
                        ) : null}
                        {item.approval_reason ? (
                          <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
                            <p className="font-medium">Motivo da devolução</p>
                            <p className="mt-1">{item.approval_reason}</p>
                          </div>
                        ) : null}
                        {manageApproval ? (
                          <div className="rounded-2xl border border-border/70 bg-card/60 p-4">
                            <div className="flex items-start gap-3">
                              <Checkbox
                                id={`approve-item-${item.id}`}
                                checked={selectedItems[item.id] ?? true}
                                onCheckedChange={(checked) => {
                                  const approved = Boolean(checked);
                                  setSelectedItems((current) => ({ ...current, [item.id]: approved }));
                                  if (approved) {
                                    setReturnedReasons((current) => ({ ...current, [item.id]: '' }));
                                  }
                                }}
                              />
                              <div className="space-y-2">
                                <Label htmlFor={`approve-item-${item.id}`} className="font-medium">
                                  Aprovar este item para execução
                                </Label>
                                <p className="text-xs text-muted-foreground">
                                  Desmarque para devolver ao fornecedor pedindo ajuste específico neste item.
                                </p>
                              </div>
                            </div>
                            {!selectedItems[item.id] ? (
                              <Textarea
                                value={returnedReasons[item.id] || ''}
                                onChange={(e) => setReturnedReasons((current) => ({ ...current, [item.id]: e.target.value }))}
                                placeholder="Explique ao fornecedor o que precisa ser corrigido neste item"
                                className="mt-3 min-h-24 rounded-2xl border-border/70 bg-background/80"
                              />
                            ) : null}
                          </div>
                        ) : null}
                      </div>

                      <div className="grid w-full max-w-3xl gap-4 lg:grid-cols-2">
                        <EvidenceBlock
                          title="Necessidade do serviço"
                          tone="text-primary"
                          attachments={beforeAttachments}
                          emptyLabel="Nenhuma evidência inicial enviada."
                          canUpload={!canManage && executable}
                          blockedMessage={executable ? undefined : 'Item devolvido ao fornecedor. Este item não segue para execução agora.'}
                          inputKey={`before-${item.id}`}
                          uploadingKey={uploadingKey}
                          onUpload={(file) => void handleAttachmentUpload(item.id, 'before', file)}
                        />
                        <EvidenceBlock
                          title="Serviço realizado"
                          tone="text-success"
                          attachments={afterAttachments}
                          emptyLabel="Nenhuma evidência final enviada."
                          canUpload={!canManage && executable}
                          blockedMessage={executable ? undefined : 'Item devolvido ao fornecedor. A execução deste item está suspensa até novo envio.'}
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
                    Aprovar OS inteira
                  </Button>
                  {order.status === 'aguardando_aprovacao' ? (
                    <Button className="w-full rounded-2xl" variant="secondary" disabled={!partialApprovalSummary.valid} onClick={() => void handlePartialApproval()}>
                      <ShieldCheck className="h-4 w-4" />
                      Aprovar parcialmente
                    </Button>
                  ) : null}
                  {order.status === 'aguardando_aprovacao' && partialApprovalSummary.isPartial && !partialApprovalSummary.valid ? (
                    <p className="text-xs text-warning">
                      Para aprovação parcial, deixe alguns itens marcados como aprovados e preencha o motivo dos itens devolvidos.
                    </p>
                  ) : null}
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

                  {order.status === 'aprovada_parcial' ? (
                    <div className="rounded-2xl border border-warning/30 bg-warning/10 p-4 text-sm text-warning">
                      Apenas os itens aprovados seguem para execução. Os demais ficaram devolvidos ao fornecedor com o motivo informado no item.
                    </div>
                  ) : null}

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
                      Envie todas as fotos dos serviços aprovados antes de finalizar.
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
  blockedMessage,
  inputKey,
  uploadingKey,
  onUpload,
}: {
  title: string;
  tone: string;
  attachments: OrderAttachment[];
  emptyLabel: string;
  canUpload: boolean;
  blockedMessage?: string;
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
          {blockedMessage || 'Somente o fornecedor pode enviar arquivos nesta etapa.'}
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

