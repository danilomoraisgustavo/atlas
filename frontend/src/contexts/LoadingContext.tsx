import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { LoadingOverlay } from '@/components/common/LoadingOverlay';

export const LOADING_START_EVENT = 'atlas-loading:start';
export const LOADING_END_EVENT = 'atlas-loading:end';

interface LoadingEventDetail {
  message?: string;
}

interface LoadingContextValue {
  startLoading: (message?: string) => void;
  stopLoading: () => void;
}

const LoadingContext = createContext<LoadingContextValue | undefined>(undefined);

export function LoadingProvider({ children }: { children: React.ReactNode }) {
  const [pendingCount, setPendingCount] = useState(0);
  const [message, setMessage] = useState('Carregando informações...');

  useEffect(() => {
    const handleStart = (event: Event) => {
      const customEvent = event as CustomEvent<LoadingEventDetail>;
      setPendingCount((current) => current + 1);
      setMessage(customEvent.detail?.message || 'Carregando informações...');
    };

    const handleEnd = () => {
      setPendingCount((current) => {
        const next = Math.max(0, current - 1);
        if (!next) {
          setMessage('Carregando informações...');
        }
        return next;
      });
    };

    window.addEventListener(LOADING_START_EVENT, handleStart as EventListener);
    window.addEventListener(LOADING_END_EVENT, handleEnd);

    return () => {
      window.removeEventListener(LOADING_START_EVENT, handleStart as EventListener);
      window.removeEventListener(LOADING_END_EVENT, handleEnd);
    };
  }, []);

  const value = useMemo(
    () => ({
      startLoading: (nextMessage?: string) => {
        window.dispatchEvent(new CustomEvent<LoadingEventDetail>(LOADING_START_EVENT, { detail: { message: nextMessage } }));
      },
      stopLoading: () => {
        window.dispatchEvent(new Event(LOADING_END_EVENT));
      },
    }),
    [],
  );

  return (
    <LoadingContext.Provider value={value}>
      {children}
      {pendingCount > 0 ? <LoadingOverlay label={message} /> : null}
    </LoadingContext.Provider>
  );
}

export function useLoading() {
  const context = useContext(LoadingContext);
  if (!context) throw new Error('useLoading deve ser usado dentro de LoadingProvider');
  return context;
}
