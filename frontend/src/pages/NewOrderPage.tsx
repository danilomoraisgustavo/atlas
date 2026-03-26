import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, CheckCircle2, FileImage, FileSearch, ShieldCheck, TriangleAlert, UploadCloud, Wrench } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useAuth, getApiErrorMessage } from '@/contexts/AuthContext';
import { API_BASE_URL, apiFetch } from '@/api/client';
import type { ServiceOrder, ServiceOrderItem, Vehicle } from '@/types/app';
import { toast } from 'sonner';

async function sendEvidence(token: string | null, orderId: number, itemId: number, file: File) {
  const form = new FormData();
  form.append('category', 'before');
  form.append('item_id', String(itemId));
  form.append('file', file);
  return apiFetch(`/orders/${orderId}/attachments`, { method: 'POST', body: form, token });
}

function formatCurrency(value: number) {
  return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
}

function looksLikeService(item: ServiceOrderItem) {
  const description = (item.description || '').toUpperCase();
  const unit = (item.unit || '').toUpperCase();
  const keywords = [
    'MAO DE OBRA', 'MÃO DE OBRA', 'SERVICO', 'SERVIÇO', 'SCANNER', 'RETIFICA', 'TROCA',
    'REPARO', 'RECUPERACAO', 'RECUPERAÇÃO', 'REVISAO', 'REVISÃO', 'ELETRICA', 'ELÉTRICA',
    'ELETRICO', 'ELÉTRICO', 'MECANICA', 'MECÂNICA', 'MECANICO', 'MECÂNICO', 'INSTALACAO',
    'INSTALAÇÃO', 'DIAGNOSTICO', 'DIAGNÓSTICO', 'MANUTENCAO', 'MANUTENÇÃO', 'LIMPEZA',
    'REGULAGEM', 'ALINHAMENTO', 'BALANCEAMENTO'
  ];

  return item.item_type === 'servico' || keywords.some((keyword) => description.includes(keyword)) || ['SV', 'MO', 'HR', 'HS'].includes(unit);
}

function requiresExecutionDescription(item: ServiceOrderItem) {
  return looksLikeService(item);
}

export default function NewOrderPage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehicleId, setVehicleId] = useState<string>('');
  const [observations, setObservations] = useState('');
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [order, setOrder] = useState<ServiceOrder | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadingItemId, setUploadingItemId] = useState<number | null>(null);

  useEffect(() => {
    apiFetch<Vehicle[]>('/vehicles', { token }).then(setVehicles).catch((error) => toast.error(getApiErrorMessage(error)));
  }, [token]);

  const beforeCounts = useMemo(() => {
    const counts = new Map<number, number>();
    order?.attachments
      .filter((attachment) => attachment.category === 'before' && attachment.item_id)
      .forEach((attachment) => {
        counts.set(attachment.item_id as number, (counts.get(attachment.item_id as number) || 0) + 1);
      });
    return counts;
  }, [order]);

  const evidenceComplete = useMemo(
    () => Boolean(order?.items.length) && order.items.every((item) => (beforeCounts.get(item.id) || 0) >= item.need_evidence_count),
    [beforeCounts, order],
  );

  const serviceDescriptionsComplete = useMemo(
    () =>
      Boolean(order?.items.length) &&
      order.items.every((item) => !requiresExecutionDescription(item) || Boolean(item.service_execution_description?.trim())),
    [order],
  );

  const readyToSubmit = evidenceComplete && serviceDescriptionsComplete;

  const handleUpload = async () => {
    if (!documentFile) return toast.error('Selecione o PDF ou imagem da ordem de serviço.');
    setLoading(true);
    try {
      const form = new FormData();
      if (vehicleId) form.append('vehicle_id', vehicleId);
      form.append('observations', observations);
      form.append('document', documentFile);
      const parsed = await apiFetch<ServiceOrder>('/orders/upload-parse', { method: 'POST', body: form, token });
      setOrder(parsed);
      toast.success('OS lida com sucesso. Agora revise os itens, descreva os serviços e anexe as fotos obrigatórias.');
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const updateItem = (itemId: number, updater: (item: ServiceOrderItem) => ServiceOrderItem) => {
    setOrder((current) => {
      if (!current) return current;
      return {
        ...current,
        items: current.items.map((item) => (item.id === itemId ? updater(item) : item)),
      };
    });
  };

  const handleEvidenceUpload = async (itemId: number, file: File | null) => {
    if (!order || !file) return;
    setUploadingItemId(itemId);
    try {
      await sendEvidence(token, order.id, itemId, file);
      const updated = await apiFetch<ServiceOrder>(`/orders/${order.id}`, { token });
      setOrder({
        ...updated,
        items: updated.items.map((item) => {
          const currentItem = order.items.find((candidate) => candidate.id === item.id);
          return {
            ...item,
            service_execution_description: currentItem?.service_execution_description || item.service_execution_description || '',
          };
        }),
      });
      toast.success('Foto comprobatória enviada com sucesso.');
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setUploadingItemId(null);
    }
  };

  const confirmOrder = async () => {
    if (!order) return;
    if (!evidenceComplete) {
      toast.error('Anexe a foto comprobatória em todos os itens antes de enviar para aprovação.');
      return;
    }
    if (!serviceDescriptionsComplete) {
      toast.error('Descreva o que será feito em todos os itens de serviço antes de enviar para aprovação.');
      return;
    }

    try {
      await apiFetch(`/orders/${order.id}/confirm-parsed`, {
        method: 'PUT',
        token,
        body: JSON.stringify({
          ...order,
          items: order.items.map((item) => ({
            item_code: item.item_code,
            description: item.description,
            item_type: item.item_type,
            quantity: Number(item.quantity),
            unit: item.unit,
            unit_price: Number(item.unit_price),
            total_price: Number(item.total_price),
            confidence: Number(item.confidence),
            need_evidence_count: Number(item.need_evidence_count),
            done_evidence_count: Number(item.done_evidence_count),
            service_execution_description: item.service_execution_description?.trim() || null,
          })),
        }),
      });
      toast.success('OS confirmada e enviada para aprovação do gestor.');
      navigate('/ordens');
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  };

  return (
    <AppLayout title="Nova ordem de serviço">
      <div className="grid gap-6 xl:grid-cols-[1fr,1.15fr]">
        <Card className="premium-card border-border/70 bg-card/85">
          <CardHeader>
            <CardTitle className="text-xl">Leitura inteligente da OS</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="rounded-3xl border border-border/70 bg-secondary/50 p-5">
              <div className="mb-3 flex items-center gap-2 text-primary">
                <UploadCloud className="h-4 w-4" />
                <span className="text-xs uppercase tracking-[0.18em]">Passo 1</span>
              </div>
              <p className="text-sm text-muted-foreground">Envie o documento da ordem para extrair dados, itens e totais automaticamente.</p>
            </div>

            <div className="space-y-2">
              <Label>Veículo</Label>
              <Select value={vehicleId} onValueChange={setVehicleId}>
                <SelectTrigger className="rounded-2xl border-border/70 bg-background/80">
                  <SelectValue placeholder="Selecione um veículo" />
                </SelectTrigger>
                <SelectContent>
                  {vehicles.map((vehicle) => (
                    <SelectItem key={vehicle.id} value={String(vehicle.id)}>
                      {vehicle.plate} - {vehicle.model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Observações técnicas</Label>
              <Textarea
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                placeholder="Descreva o contexto do reparo."
                className="min-h-28 rounded-2xl border-border/70 bg-background/80"
              />
            </div>

            <div className="space-y-2">
              <Label>Documento (PDF ou imagem)</Label>
              <Input type="file" accept=".pdf,image/*" onChange={(e) => setDocumentFile(e.target.files?.[0] || null)} className="rounded-2xl border-border/70 bg-background/80" />
            </div>

            <Button onClick={handleUpload} disabled={loading} className="w-full rounded-2xl">
              {loading ? 'Processando documento...' : 'Ler documento com OCR'}
            </Button>
          </CardContent>
        </Card>

        <Card className="premium-card border-border/70 bg-card/85">
          <CardHeader>
            <CardTitle className="text-xl">Prévia da revisão do fornecedor</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {!order ? (
              <div className="rounded-3xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                Após o upload, o sistema exibirá os itens lidos e exigirá foto por item. Nos serviços, o fornecedor também deverá descrever o que será executado.
              </div>
            ) : (
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-3xl border border-border/70 bg-background/80 p-5">
                    <div className="mb-2 flex items-center gap-2 text-info">
                      <FileSearch className="h-4 w-4" />
                      <span className="text-xs uppercase tracking-[0.18em]">Leitura</span>
                    </div>
                    <p className="font-medium">OS {order.order_number || 'não identificada'}</p>
                    <p className="mt-1 text-sm text-muted-foreground">Placa: {order.vehicle_plate || 'não identificada'}</p>
                    <p className="mt-1 text-sm text-muted-foreground">Confiança OCR: {Math.round(order.confidence * 100)}%</p>
                    <p className="mt-1 text-sm text-muted-foreground">Total: {formatCurrency(order.total_value)}</p>
                  </div>
                  <div className={`rounded-3xl border p-5 ${readyToSubmit ? 'border-success/30 bg-success/10' : 'border-warning/30 bg-warning/10'}`}>
                    <div className="mb-2 flex items-center gap-2">
                      {readyToSubmit ? <CheckCircle2 className="h-4 w-4 text-success" /> : <TriangleAlert className="h-4 w-4 text-warning" />}
                      <span className="text-xs uppercase tracking-[0.18em]">{readyToSubmit ? 'Pronto para envio' : 'Ação necessária'}</span>
                    </div>
                    <p className="font-medium">
                      {readyToSubmit
                        ? 'Fotos e descrições obrigatórias preenchidas.'
                        : 'Ainda faltam fotos ou descrição detalhada dos serviços para liberar a aprovação.'}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  {order.items.map((item) => {
                    const itemAttachments = order.attachments.filter((attachment) => attachment.category === 'before' && attachment.item_id === item.id);
                    const currentCount = beforeCounts.get(item.id) || 0;
                    const completed = currentCount >= item.need_evidence_count;
                    const needsDescription = requiresExecutionDescription(item);
                    const descriptionFilled = Boolean(item.service_execution_description?.trim());

                    return (
                      <div key={item.id} className="rounded-3xl border border-border/70 bg-background/80 p-5">
                        <div className="flex flex-col gap-4">
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant="outline" className="rounded-full border-border/70 bg-card px-3 py-1 text-xs">
                                {item.item_type}
                              </Badge>
                              <Badge className={`rounded-full px-3 py-1 text-xs ${completed ? 'bg-success/15 text-success' : 'bg-warning/15 text-warning'}`}>
                                {currentCount}/{item.need_evidence_count} foto(s)
                              </Badge>
                              {needsDescription ? (
                                <Badge className={`rounded-full px-3 py-1 text-xs ${descriptionFilled ? 'bg-success/15 text-success' : 'bg-warning/15 text-warning'}`}>
                                  {descriptionFilled ? 'Serviço descrito' : 'Descrever serviço'}
                                </Badge>
                              ) : null}
                            </div>
                            <p className="text-lg font-semibold">{item.description}</p>
                            <p className="text-sm text-muted-foreground">
                              {item.quantity} {item.unit} • {formatCurrency(item.total_price)}
                            </p>
                          </div>

                          {needsDescription ? (
                            <div className="rounded-2xl border border-border/70 bg-card/70 p-4">
                              <div className="mb-2 flex items-center gap-2 text-primary">
                                <Wrench className="h-4 w-4" />
                                <span className="text-xs uppercase tracking-[0.18em]">Descrição do serviço</span>
                              </div>
                              <Textarea
                                value={item.service_execution_description || ''}
                                onChange={(e) =>
                                  updateItem(item.id, (currentItem) => ({
                                    ...currentItem,
                                    service_execution_description: e.target.value,
                                  }))
                                }
                                placeholder="Explique o que será feito neste serviço. Ex.: revisão elétrica, troca de chicote, reparo no alternador..."
                                className="min-h-24 rounded-2xl border-border/70 bg-background/80"
                              />
                              <p className="mt-2 text-xs text-muted-foreground">
                                Esse campo é obrigatório para itens de mão de obra/serviço antes do envio ao gestor.
                              </p>
                            </div>
                          ) : null}

                          <div className="w-full max-w-sm space-y-3">
                            <div className="rounded-2xl border border-border/70 bg-card/70 p-4">
                              <div className="mb-2 flex items-center gap-2 text-primary">
                                <Camera className="h-4 w-4" />
                                <span className="text-xs uppercase tracking-[0.18em]">Evidência obrigatória</span>
                              </div>
                              <Input
                                type="file"
                                accept="image/*"
                                className="rounded-2xl border-border/70 bg-background/80"
                                disabled={uploadingItemId === item.id}
                                onChange={(e) => {
                                  const file = e.target.files?.[0] || null;
                                  void handleEvidenceUpload(item.id, file);
                                  e.currentTarget.value = '';
                                }}
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              {itemAttachments.map((attachment) => (
                                <a
                                  key={attachment.id}
                                  href={`${API_BASE_URL}${attachment.file_path}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="group overflow-hidden rounded-2xl border border-border/70 bg-card"
                                >
                                  <div className="aspect-[4/3] bg-muted">
                                    {attachment.media_type === 'image' ? (
                                      <img src={`${API_BASE_URL}${attachment.file_path}`} alt={attachment.file_name} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                                    ) : (
                                      <div className="flex h-full items-center justify-center text-muted-foreground">
                                        <FileImage className="h-5 w-5" />
                                      </div>
                                    )}
                                  </div>
                                  <div className="p-2 text-[11px] text-muted-foreground">{attachment.file_name}</div>
                                </a>
                              ))}
                              {!itemAttachments.length ? (
                                <div className="col-span-2 rounded-2xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                                  Nenhuma foto enviada ainda.
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="rounded-3xl border border-border/70 bg-secondary/50 p-5">
                  <div className="mb-2 flex items-center gap-2 text-primary">
                    <ShieldCheck className="h-4 w-4" />
                    <span className="text-xs uppercase tracking-[0.18em]">Passo 2</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    O envio para aprovação do gestor só será liberado quando todos os itens tiverem foto comprobatória e, nos serviços, descrição do que será executado.
                  </p>
                </div>

                <Button onClick={confirmOrder} disabled={!readyToSubmit} className="w-full rounded-2xl">
                  Confirmar leitura e enviar para aprovação
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

