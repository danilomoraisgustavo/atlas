import { useEffect, useState } from 'react';
import { Pencil, PlusCircle, Trash2 } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth, getApiErrorMessage } from '@/contexts/AuthContext';
import { apiFetch } from '@/api/client';
import type { Vehicle } from '@/types/app';
import { toast } from 'sonner';

type VehicleForm = {
  plate: string;
  prefix: string;
  model: string;
  brand: string;
  type: string;
  department: string;
  status: string;
  observations: string;
};

const initialForm: VehicleForm = {
  plate: '',
  prefix: '',
  model: '',
  brand: '',
  type: '',
  department: '',
  status: 'ativo',
  observations: '',
};

export default function VehiclesPage() {
  const { token } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [vehicleToDelete, setVehicleToDelete] = useState<Vehicle | null>(null);
  const [createForm, setCreateForm] = useState<VehicleForm>(initialForm);
  const [form, setForm] = useState<VehicleForm>(initialForm);

  const loadVehicles = async () => {
    setLoading(true);
    try {
      const data = await apiFetch<Vehicle[]>('/vehicles', {
        token,
        loaderMessage: 'Carregando veículos...',
      });
      setVehicles(data);
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadVehicles();
  }, [token]);

  const openEdit = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setForm({
      plate: vehicle.plate || '',
      prefix: vehicle.prefix || '',
      model: vehicle.model || '',
      brand: vehicle.brand || '',
      type: vehicle.type || '',
      department: vehicle.department || '',
      status: vehicle.status || 'ativo',
      observations: vehicle.observations || '',
    });
  };

  const resetCreateModal = (open: boolean) => {
    setCreateOpen(open);
    if (!open) {
      setCreateForm(initialForm);
    }
  };

  const createVehicle = async () => {
    if (!createForm.plate.trim()) {
      toast.error('Informe a placa do veículo.');
      return;
    }

    setSaving(true);
    try {
      await apiFetch<Vehicle>('/vehicles', {
        method: 'POST',
        token,
        body: JSON.stringify({
          ...createForm,
          plate: createForm.plate.trim().toUpperCase(),
        }),
        loaderMessage: 'Cadastrando veículo...',
      });
      toast.success('Veículo cadastrado com sucesso.');
      setCreateForm(initialForm);
      setCreateOpen(false);
      await loadVehicles();
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const saveVehicle = async () => {
    if (!editingVehicle) return;

    setSaving(true);
    try {
      await apiFetch(`/vehicles/${editingVehicle.id}`, {
        method: 'PUT',
        token,
        body: JSON.stringify({
          ...form,
          plate: form.plate.trim().toUpperCase(),
        }),
        loaderMessage: 'Salvando alterações do veículo...',
      });
      toast.success('Veículo atualizado com sucesso.');
      setEditingVehicle(null);
      await loadVehicles();
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const deleteVehicle = async () => {
    if (!vehicleToDelete) return;

    setSaving(true);
    try {
      await apiFetch(`/vehicles/${vehicleToDelete.id}`, {
        method: 'DELETE',
        token,
        loaderMessage: 'Apagando veículo...',
      });
      toast.success('Veículo excluído com sucesso.');
      setVehicleToDelete(null);
      await loadVehicles();
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout title="Veículos">
      <Card className="premium-card border-border/70 bg-card/85">
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="text-xl">Cadastro de veículos</CardTitle>
            <p className="text-sm text-muted-foreground">Gerencie a frota com cadastro completo, edição rápida e histórico operacional organizado.</p>
          </div>
          <Button onClick={() => setCreateOpen(true)} className="rounded-2xl px-5">
            <PlusCircle className="h-4 w-4" />
            Cadastrar veículo
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-3xl border border-border/70 bg-background/80">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow className="hover:bg-muted/40">
                  <TableHead>Placa</TableHead>
                  <TableHead>Prefixo</TableHead>
                  <TableHead>Modelo</TableHead>
                  <TableHead>Marca</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Departamento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[180px] text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vehicles.map((vehicle) => (
                  <TableRow key={vehicle.id}>
                    <TableCell className="font-semibold">{vehicle.plate}</TableCell>
                    <TableCell>{vehicle.prefix || '-'}</TableCell>
                    <TableCell>{vehicle.model || '-'}</TableCell>
                    <TableCell>{vehicle.brand || '-'}</TableCell>
                    <TableCell>{vehicle.type || '-'}</TableCell>
                    <TableCell>{vehicle.department || '-'}</TableCell>
                    <TableCell>
                      <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium capitalize text-secondary-foreground">
                        {formatStatus(vehicle.status)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" className="rounded-2xl" onClick={() => openEdit(vehicle)}>
                          <Pencil className="h-4 w-4" />
                          Editar
                        </Button>
                        <Button variant="destructive" className="rounded-2xl" onClick={() => setVehicleToDelete(vehicle)}>
                          <Trash2 className="h-4 w-4" />
                          Apagar
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {!vehicles.length && !loading ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={8} className="px-6 py-10 text-center text-sm text-muted-foreground">
                      Nenhum veículo cadastrado ainda. Clique em `Cadastrar veículo` para incluir o primeiro item da frota.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={resetCreateModal}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Cadastrar veículo</DialogTitle>
            <DialogDescription>Preencha os dados principais da frota para liberar uso nas ordens de serviço e checklists.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 md:grid-cols-2">
            <VehicleFields form={createForm} onChange={setCreateForm} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => resetCreateModal(false)}>Cancelar</Button>
            <Button onClick={createVehicle} disabled={saving}>
              <PlusCircle className="h-4 w-4" />
              Cadastrar veículo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editingVehicle)} onOpenChange={(open) => !open && setEditingVehicle(null)}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Editar veículo</DialogTitle>
            <DialogDescription>Atualize os dados da frota para manter o cadastro consistente e confiável.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 md:grid-cols-2">
            <VehicleFields form={form} onChange={setForm} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingVehicle(null)}>Cancelar</Button>
            <Button onClick={saveVehicle} disabled={saving}>Salvar alterações</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(vehicleToDelete)} onOpenChange={(open) => !open && setVehicleToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apagar veículo</DialogTitle>
            <DialogDescription>
              Esta ação removerá o veículo {vehicleToDelete?.plate}. Confirme apenas se tiver certeza.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVehicleToDelete(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={deleteVehicle} disabled={saving}>Apagar veículo</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

function VehicleFields({
  form,
  onChange,
}: {
  form: VehicleForm;
  onChange: React.Dispatch<React.SetStateAction<VehicleForm>>;
}) {
  return (
    <>
      <Field label="Placa">
        <Input value={form.plate} onChange={(e) => onChange((current) => ({ ...current, plate: e.target.value.toUpperCase() }))} placeholder="ABC1D23" />
      </Field>
      <Field label="Prefixo interno">
        <Input value={form.prefix} onChange={(e) => onChange((current) => ({ ...current, prefix: e.target.value }))} placeholder="FROTA-12" />
      </Field>
      <Field label="Modelo">
        <Input value={form.model} onChange={(e) => onChange((current) => ({ ...current, model: e.target.value }))} placeholder="Sprinter 417" />
      </Field>
      <Field label="Marca">
        <Input value={form.brand} onChange={(e) => onChange((current) => ({ ...current, brand: e.target.value }))} placeholder="Mercedes-Benz" />
      </Field>
      <Field label="Tipo de veículo">
        <Input value={form.type} onChange={(e) => onChange((current) => ({ ...current, type: e.target.value }))} placeholder="Van, utilitário, caminhão..." />
      </Field>
      <Field label="Departamento">
        <Input value={form.department} onChange={(e) => onChange((current) => ({ ...current, department: e.target.value }))} placeholder="Operações" />
      </Field>
      <Field label="Status operacional">
        <Select value={form.status} onValueChange={(value) => onChange((current) => ({ ...current, status: value }))}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ativo">Ativo</SelectItem>
            <SelectItem value="inativo">Inativo</SelectItem>
            <SelectItem value="manutencao">Manutenção</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <div className="md:col-span-2">
        <Field label="Observações gerais">
          <Textarea
            value={form.observations}
            onChange={(e) => onChange((current) => ({ ...current, observations: e.target.value }))}
            className="min-h-32"
            placeholder="Exemplo: veículo reserva, uso dedicado, restrições, notas operacionais."
          />
        </Field>
      </div>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function formatStatus(status: string) {
  if (status === 'manutencao') return 'Manutenção';
  if (status === 'inativo') return 'Inativo';
  return 'Ativo';
}
