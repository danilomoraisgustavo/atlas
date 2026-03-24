import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import Dashboard from './pages/Dashboard';
import OrdersList from './pages/OrdersList';
import OrderDetail from './pages/OrderDetail';
import VehiclesPage from './pages/VehiclesPage';
import MeasurementPage from './pages/MeasurementPage';
import MaintenanceCalendarPage from './pages/MaintenanceCalendarPage';
import UsersPage from './pages/UsersPage';
import AuditPage from './pages/AuditPage';
import NotificationsPage from './pages/NotificationsPage';
import SupplierDashboard from './pages/SupplierDashboard';
import NewOrderPage from './pages/NewOrderPage';
import NotFound from './pages/NotFound';
import LoginPage from './pages/LoginPage';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/app/ProtectedRoute';
import { LoadingProvider } from '@/contexts/LoadingContext';

const queryClient = new QueryClient();

function TemplateRoutes() {
  const { user } = useAuth();
  const userRole: 'gestor' | 'fornecedor' = user?.role === 'fornecedor' ? 'fornecedor' : 'gestor';

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={userRole === 'gestor' ? <Dashboard /> : <Navigate to="/fornecedor" replace />} />
        <Route path="/ordens" element={<OrdersList />} />
        <Route path="/ordens/:id" element={<OrderDetail />} />
        <Route path="/notificacoes" element={<NotificationsPage />} />
        <Route path="/manutencao" element={<MaintenanceCalendarPage />} />
      </Route>

      <Route element={<ProtectedRoute roles={['gestor', 'admin', 'fiscal']} />}>
        <Route path="/veiculos" element={<VehiclesPage />} />
        <Route path="/medicao" element={<MeasurementPage />} />
        <Route path="/usuarios" element={<UsersPage />} />
        <Route path="/auditoria" element={<AuditPage />} />
      </Route>

      <Route element={<ProtectedRoute roles={['fornecedor']} />}>
        <Route path="/fornecedor" element={<SupplierDashboard />} />
        <Route path="/fornecedor/nova" element={<NewOrderPage />} />
        <Route path="/fornecedor/manutencao" element={<MaintenanceCalendarPage />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <LoadingProvider>
          <AuthProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <TemplateRoutes />
            </BrowserRouter>
          </AuthProvider>
        </LoadingProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
