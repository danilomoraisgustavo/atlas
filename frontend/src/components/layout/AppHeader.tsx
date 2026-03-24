import { Bell, LogOut, ShieldCheck, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface AppHeaderProps {
  title?: string;
  userRole?: 'gestor' | 'fornecedor';
  onToggleRole?: () => void;
}

export function AppHeader({ title, userRole = 'gestor' }: AppHeaderProps) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const effectiveRole = user?.role === 'fornecedor' ? 'fornecedor' : userRole;
  const roleLabel = effectiveRole === 'gestor' ? 'Gestor' : 'Fornecedor';

  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/65 backdrop-blur-xl">
      <div className="mx-auto flex min-h-[72px] w-full max-w-7xl items-center justify-between gap-4 px-4 py-3 md:px-6 lg:px-8">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold text-foreground md:text-2xl">{title}</h1>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="hidden gap-1.5 rounded-full border-border/70 bg-card/80 px-3 py-1 text-xs md:inline-flex">
            <ShieldCheck className="h-3.5 w-3.5" />
            {roleLabel}
          </Badge>

          <Button variant="ghost" size="icon" className="relative rounded-full border border-border/60 bg-card/70" onClick={() => navigate('/notificacoes')}>
            <Bell className="h-4 w-4" />
            <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground">
              2
            </span>
          </Button>

          <div className="hidden items-center gap-3 rounded-full border border-border/70 bg-card/75 px-2 py-1.5 md:flex">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
              <User className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0 pr-2">
              <p className="truncate text-sm font-semibold">{user?.name || roleLabel}</p>
              <p className="truncate text-xs text-muted-foreground">{user?.email || 'Painel autenticado'}</p>
            </div>
          </div>

          <Button variant="outline" size="sm" className="gap-1.5 rounded-full border-border/70 bg-card/80 text-xs" onClick={() => { logout(); navigate('/login'); }}>
            <LogOut className="h-3.5 w-3.5" />
            Sair
          </Button>
        </div>
      </div>
    </header>
  );
}
