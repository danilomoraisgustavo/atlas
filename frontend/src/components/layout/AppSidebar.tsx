import { Link, useLocation } from 'react-router-dom';
import { Bell, CalendarDays, Car, ChevronLeft, ChevronRight, FileText, LayoutDashboard, PlusCircle, Ruler, Shield, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { BrandMark } from '@/components/brand/BrandMark';

interface NavItem {
  label: string;
  icon: React.ElementType;
  path: string;
}

export function AppSidebar() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const { user } = useAuth();

  const items = useMemo<NavItem[]>(() => {
    if (user?.role === 'fornecedor') {
      return [
        { label: 'Painel', icon: LayoutDashboard, path: '/fornecedor' },
        { label: 'Nova OS', icon: PlusCircle, path: '/fornecedor/nova' },
        { label: 'Checklist', icon: CalendarDays, path: '/fornecedor/manutencao' },
        { label: 'Ordens', icon: FileText, path: '/ordens' },
        { label: 'Notificações', icon: Bell, path: '/notificacoes' },
      ];
    }

    return [
      { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
      { label: 'Ordens', icon: FileText, path: '/ordens' },
      { label: 'Veículos', icon: Car, path: '/veiculos' },
      { label: 'Medição', icon: Ruler, path: '/medicao' },
      { label: 'Checklist', icon: CalendarDays, path: '/manutencao' },
      { label: 'Usuários', icon: Users, path: '/usuarios' },
      { label: 'Auditoria', icon: Shield, path: '/auditoria' },
      { label: 'Notificações', icon: Bell, path: '/notificacoes' },
    ];
  }, [user?.role]);

  return (
    <aside className={cn('sticky top-0 hidden h-screen flex-col border-r border-sidebar-border/80 bg-sidebar text-sidebar-foreground transition-all duration-300 md:flex', collapsed ? 'w-20' : 'w-72')}>
      <div className="flex h-20 items-center gap-3 border-b border-sidebar-border/80 px-5">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl shadow-lg shadow-black/15">
          <BrandMark className="h-11 w-11" />
        </div>
        {!collapsed ? (
          <div className="min-w-0">
            <p className="truncate text-base font-semibold">Atlas Frota</p>
            <p className="truncate text-[11px] uppercase tracking-[0.22em] text-sidebar-muted">Gestão de Manutenção</p>
          </div>
        ) : null}
      </div>
      <nav className="flex-1 space-y-1.5 overflow-y-auto px-3 py-5">
        {items.map((item) => {
          const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'flex items-center gap-3 rounded-2xl px-3.5 py-3 text-sm transition-all',
                isActive
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-lg shadow-black/15'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed ? <span className="truncate">{item.label}</span> : null}
            </Link>
          );
        })}
      </nav>

      <button
        onClick={() => setCollapsed(!collapsed)}
        className="mx-3 mb-4 flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 py-3 text-sidebar-muted transition-colors hover:text-sidebar-foreground"
      >
        {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </button>
    </aside>
  );
}
