import { useEffect } from 'react';
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingOverlay } from '@/components/common/LoadingOverlay';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export function ProtectedRoute({ roles }: { roles?: string[] }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const requiresLogin = !isAuthenticated || !user;

  useEffect(() => {
    if (!requiresLogin) return;

    const timeout = window.setTimeout(() => {
      navigate('/login', {
        replace: true,
        state: {
          from: location,
          authRedirected: true,
        },
      });
    }, 1800);

    return () => window.clearTimeout(timeout);
  }, [location, navigate, requiresLogin]);

  if (isLoading) {
    return <LoadingOverlay label="Preparando seu ambiente..." fullscreen={false} />;
  }

  if (requiresLogin) {
    return (
      <Dialog open>
        <DialogContent
          className="sm:max-w-md"
          hideClose
          onEscapeKeyDown={(event) => event.preventDefault()}
          onInteractOutside={(event) => event.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>Login necessário</DialogTitle>
            <DialogDescription>
              Sua sessão não está ativa. Você será redirecionado para a tela de login para continuar.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              className="w-full sm:w-auto"
              onClick={() =>
                navigate('/login', {
                  replace: true,
                  state: {
                    from: location,
                    authRedirected: true,
                  },
                })
              }
            >
              Ir para o login
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to={user.role === 'fornecedor' ? '/fornecedor' : '/'} replace />;
  }

  return <Outlet />;
}
