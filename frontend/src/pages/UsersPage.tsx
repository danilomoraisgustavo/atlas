import { useEffect, useState } from 'react';
import { Pencil } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth, getApiErrorMessage } from '@/contexts/AuthContext';
import { apiFetch } from '@/api/client';
import { toast } from 'sonner';

interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: string;
  active: boolean;
  permissions: string[];
}

type UserForm = {
  name: string;
  email: string;
  role: string;
  active: string;
  permissions: string;
};

const initialForm: UserForm = {
  name: '',
  email: '',
  role: 'fornecedor',
  active: 'true',
  permissions: '',
};

export default function UsersPage() {
  const { token, user } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [form, setForm] = useState<UserForm>(initialForm);
  const [saving, setSaving] = useState(false);
  const canEdit = user?.role === 'gestor';

  const loadUsers = async () => {
    try {
      const data = await apiFetch<AdminUser[]>('/admin/users', { token });
      setUsers(data);
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  };

  useEffect(() => {
    void loadUsers();
  }, [token]);

  const openEdit = (target: AdminUser) => {
    setEditingUser(target);
    setForm({
      name: target.name,
      email: target.email,
      role: target.role,
      active: String(target.active),
      permissions: target.permissions.join(', '),
    });
  };

  const saveUser = async () => {
    if (!editingUser) return;
    setSaving(true);
    try {
      await apiFetch(`/admin/users/${editingUser.id}`, {
        method: 'PUT',
        token,
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          role: form.role,
          active: form.active === 'true',
          permissions: form.permissions.split(',').map((item) => item.trim()).filter(Boolean),
        }),
      });
      toast.success('Usuário atualizado com sucesso.');
      setEditingUser(null);
      await loadUsers();
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout title="Usuários">
      <Card className="premium-card border-border/70 bg-card/85">
        <CardHeader>
          <CardTitle className="text-xl">Usuários do sistema</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          {users.map((item) => (
            <div key={item.id} className="rounded-3xl border border-border/70 bg-background/80 p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-2">
                  <p className="text-lg font-semibold">{item.name}</p>
                  <p className="text-sm text-muted-foreground">{item.email}</p>
                  <p className="text-xs text-muted-foreground">
                    Perfil: {item.role} • Status: {item.active ? 'Ativo' : 'Inativo'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Permissões: {item.permissions.join(', ') || '-'}
                  </p>
                </div>

                {canEdit ? (
                  <Button variant="outline" className="rounded-2xl" onClick={() => openEdit(item)}>
                    <Pencil className="h-4 w-4" />
                    Editar usuário
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog open={Boolean(editingUser)} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar usuário</DialogTitle>
            <DialogDescription>Somente o gestor pode alterar os dados dos usuários.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Nome">
              <Input value={form.name} onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))} />
            </Field>
            <Field label="E-mail">
              <Input value={form.email} onChange={(e) => setForm((current) => ({ ...current, email: e.target.value }))} />
            </Field>
            <Field label="Perfil">
              <Select value={form.role} onValueChange={(value) => setForm((current) => ({ ...current, role: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gestor">Gestor</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="fiscal">Fiscal</SelectItem>
                  <SelectItem value="fornecedor">Fornecedor</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Status">
              <Select value={form.active} onValueChange={(value) => setForm((current) => ({ ...current, active: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Ativo</SelectItem>
                  <SelectItem value="false">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <div className="md:col-span-2">
              <Field label="Permissões">
                <Input
                  value={form.permissions}
                  onChange={(e) => setForm((current) => ({ ...current, permissions: e.target.value }))}
                  placeholder="Separe por vírgula. Ex.: all, upload_orders"
                />
              </Field>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)}>Cancelar</Button>
            <Button onClick={saveUser} disabled={saving}>Salvar alterações</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
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
