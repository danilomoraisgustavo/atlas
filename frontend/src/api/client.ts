const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
const LOADING_START_EVENT = 'atlas-loading:start';
const LOADING_END_EVENT = 'atlas-loading:end';

export class ApiError extends Error {
  status: number;
  detail: string;

  constructor(status: number, detail: string) {
    super(detail);
    this.status = status;
    this.detail = detail;
  }
}

export type RequestOptions = RequestInit & {
  token?: string | null;
  params?: Record<string, string | number | undefined | null>;
  showLoader?: boolean;
  loaderMessage?: string;
};

function buildUrl(path: string, params?: RequestOptions['params']) {
  const normalizedUrl = path.startsWith('http')
    ? path
    : `${API_BASE_URL.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;

  const url = new URL(normalizedUrl, window.location.origin);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    });
  }

  return url.toString();
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  const showLoader = options.showLoader !== false;

  if (!(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (options.token) {
    headers.set('Authorization', `Bearer ${options.token}`);
  }

  if (showLoader && typeof window !== 'undefined') {
    const defaultMessage =
      options.body instanceof FormData ? 'Enviando arquivos...' : 'Carregando informações...';

    window.dispatchEvent(
      new CustomEvent(LOADING_START_EVENT, {
        detail: { message: options.loaderMessage || defaultMessage },
      }),
    );
  }

  try {
    const response = await fetch(buildUrl(path, options.params), {
      ...options,
      headers,
    });

    if (!response.ok) {
      let detail = 'Erro inesperado na API';

      try {
        const payload = await response.json();
        detail = payload.detail || detail;
      } catch {
        detail = await response.text();
      }

      throw new ApiError(response.status, detail);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      return response.json() as Promise<T>;
    }

    return response.text() as T;
  } finally {
    if (showLoader && typeof window !== 'undefined') {
      window.dispatchEvent(new Event(LOADING_END_EVENT));
    }
  }
}

export { API_BASE_URL };