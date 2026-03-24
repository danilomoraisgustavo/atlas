import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth, getApiErrorMessage } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { BrandMark } from '@/components/brand/BrandMark';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation() as { state?: { from?: { pathname?: string } } };
  const { login } = useAuth();
  const [email, setEmail] = useState('danilo.m.gustavo@gmail.com');
  const [password, setPassword] = useState('DeD-140619');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success('Login realizado com sucesso.');
      const redirectTo = location.state?.from?.pathname || (email === 'financeiro@tropicalcanaa.com.br' ? '/fornecedor' : '/');
      navigate(redirectTo, { replace: true });
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <Card className="w-full max-w-md border-border/80 shadow-xl">
        <CardHeader className="space-y-4">
          <div className="flex items-center gap-3">
            <BrandMark className="h-12 w-12" />
            <div>
              <CardTitle className="text-2xl">Atlas Frota</CardTitle>
              <p className="text-sm text-muted-foreground">Plataforma profissional de manutenção, medição e evidências da frota.</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <Button className="w-full" disabled={loading} type="submit">
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
