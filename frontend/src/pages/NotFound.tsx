import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">404</h1>
        <p className="text-muted-foreground">Página não encontrada.</p>
        <Link className="text-primary hover:underline" to="/">Voltar ao início</Link>
      </div>
    </div>
  );
}
