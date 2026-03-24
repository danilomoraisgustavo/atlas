import { BrandMark } from '@/components/brand/BrandMark';

interface LoadingOverlayProps {
  label?: string;
  fullscreen?: boolean;
}

export function LoadingOverlay({ label = 'Carregando informações...', fullscreen = true }: LoadingOverlayProps) {
  return (
    <div
      className={
        fullscreen
          ? 'fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/38 px-6 backdrop-blur-sm'
          : 'flex min-h-screen items-center justify-center px-6'
      }
    >
      <div className="glass-panel premium-card w-full max-w-sm rounded-[2rem] border border-white/45 px-7 py-8 text-center shadow-2xl shadow-slate-950/20">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[1.75rem] bg-white/85 shadow-lg shadow-slate-900/10">
          <div className="relative">
            <div className="absolute inset-0 animate-ping rounded-2xl bg-primary/20" />
            <BrandMark className="relative h-14 w-14" />
          </div>
        </div>
        <p className="mt-6 text-lg font-semibold text-foreground">Atlas Frota</p>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{label}</p>
        <div className="mt-6 flex items-center justify-center gap-2">
          <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-primary [animation-delay:-0.2s]" />
          <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-warning [animation-delay:-0.1s]" />
          <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-primary" />
        </div>
      </div>
    </div>
  );
}
