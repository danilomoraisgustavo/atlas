import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingOverlay } from '@/components/common/LoadingOverlay';

export function ProtectedRoute({ roles }: { roles?: string[] }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <LoadingOverlay label="Preparando seu ambiente..." fullscreen={false} />;
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to={user.role === 'fornecedor' ? '/fornecedor' : '/'} replace />;
  }

  return <Outlet />;
}
