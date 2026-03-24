export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: 'gestor' | 'fornecedor' | 'admin' | 'fiscal';
  active: boolean;
  permissions: string[];
}

export interface LoginResponse {
  access_token: string;
  token_type: 'bearer';
  user: AuthUser;
}

export interface DashboardMetrics {
  aguardando_aprovacao: number;
  aprovada: number;
  reprovada: number;
  em_andamento: number;
  aguardando_validacao: number;
  concluida: number;
  retrabalho: number;
  medicao: number;
  total_ordens: number;
  total_valor: number;
  aptas_medicao: number;
}

export interface OrderAttachment {
  id: number;
  category: 'before' | 'after' | 'document' | 'video' | 'support' | string;
  item_id: number | null;
  file_name: string;
  file_path: string;
  media_type: 'image' | 'video' | 'document' | string;
  uploaded_by: number;
}

export interface OrderAuditLog {
  id: number;
  action: string;
  previous_status: string | null;
  new_status: string | null;
  details: string;
  user_name: string;
  timestamp: string;
}

export interface ServiceOrderItem {
  id: number;
  item_code: string | null;
  description: string;
  item_type: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total_price: number;
  confidence: number;
  need_evidence_count: number;
  done_evidence_count: number;
  manually_edited?: boolean;
}

export interface ServiceOrder {
  id: number;
  order_number: string | null;
  issuer_name: string | null;
  issuer_cnpj: string | null;
  contractor_name: string | null;
  vehicle_id: number | null;
  vehicle_plate: string | null;
  vehicle_description: string | null;
  supplier_user_id: number;
  supplier_name: string | null;
  status: string;
  open_date: string | null;
  close_date: string | null;
  observations: string | null;
  rejection_reason: string | null;
  rework_reason: string | null;
  service_total: number;
  product_total: number;
  discount: number;
  charges: number;
  total_value: number;
  confidence: number;
  requires_review: boolean;
  measurement_status: string;
  estimated_completion: string | null;
  original_file_path: string | null;
  items: ServiceOrderItem[];
  attachments: OrderAttachment[];
  audit_logs: OrderAuditLog[];
  created_at: string | null;
  updated_at: string | null;
  parsed_payload?: Record<string, unknown>;
}

export interface Vehicle {
  id: number;
  plate: string;
  prefix?: string | null;
  model?: string | null;
  brand?: string | null;
  type?: string | null;
  department?: string | null;
  status: string;
  observations?: string | null;
}

export interface NotificationItem {
  id: number;
  title: string;
  message: string;
  category: 'info' | 'success' | 'warning' | 'error' | string;
  created_at?: string | null;
  read: boolean;
  order_id?: number | null;
}

export interface MaintenanceCalendarItem {
  vehicle_id: number;
  vehicle_plate: string;
  vehicle_model?: string | null;
  task_type: string;
  task_label: string;
  scheduled_date: string;
  completed: boolean;
  completed_at: string | null;
  notes: string;
  record_id: number | null;
  completed_by: number | null;
}

export interface MaintenanceHistoryItem {
  id: number;
  vehicle_plate: string;
  task_type: string;
  scheduled_date: string;
  completed_at: string | null;
  notes: string;
}

export interface MaintenanceCalendarResponse {
  month: string;
  weeks: Array<{
    week_start: string;
    items: MaintenanceCalendarItem[];
  }>;
  history: MaintenanceHistoryItem[];
}
