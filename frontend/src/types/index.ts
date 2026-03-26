export type OrderStatus =
  | "rascunho"
  | "aguardando_aprovacao"
  | "aprovada"
  | "aprovada_parcial"
  | "reprovada"
  | "em_andamento"
  | "aguardando_validacao"
  | "concluida"
  | "retrabalho"
  | "medicao";

export type UserRole = "gestor" | "fiscal" | "admin" | "fornecedor";

export type ItemType = "servico" | "produto";

export interface OrderItem {
  id: string;
  code: string;
  description: string;
  type: ItemType;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  confidence: number; // 0-1 confiança da leitura OCR
}

export interface ServiceOrder {
  id: string;
  orderNumber: string;
  vehicleId: string;
  vehiclePlate: string;
  vehicleModel: string;
  supplierId: string;
  supplierName: string;
  supplierCnpj: string;
  contractorName: string;
  status: OrderStatus;
  openDate: string;
  closeDate?: string;
  items: OrderItem[];
  serviceTotalValue: number;
  productTotalValue: number;
  discount: number;
  charges: number;
  totalValue: number;
  observations?: string;
  rejectionReason?: string;
  reworkReason?: string;
  originalFileUrl?: string;
  evidencesBefore: string[];
  evidencesAfter: string[];
  ocrConfidence: number;
  timeline: TimelineEvent[];
  createdAt: string;
  updatedAt: string;
}

export interface TimelineEvent {
  id: string;
  action: string;
  description: string;
  userId: string;
  userName: string;
  timestamp: string;
  oldStatus?: OrderStatus;
  newStatus?: OrderStatus;
  justification?: string;
}

export interface Vehicle {
  id: string;
  plate: string;
  prefix: string;
  model: string;
  brand: string;
  type: string;
  department: string;
  status: "ativo" | "inativo" | "manutencao";
  observations?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
  permissions: string[];
  createdAt: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  entity: string;
  entityId: string;
  oldValue?: string;
  newValue?: string;
  justification?: string;
  timestamp: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  read: boolean;
  orderId?: string;
  createdAt: string;
}

export interface DashboardStats {
  pending: number;
  approved: number;
  rejected: number;
  inProgress: number;
  awaitingValidation: number;
  completed: number;
  rework: number;
  measurement: number;
  totalValue: number;
  monthlyValue: number;
}

export const STATUS_LABELS: Record<OrderStatus, string> = {
  rascunho: "Rascunho",
  aguardando_aprovacao: "Aguardando Aprovação",
  aprovada: "Aprovada",
  aprovada_parcial: "Aprovação Parcial",
  reprovada: "Reprovada",
  em_andamento: "Em Andamento",
  aguardando_validacao: "Aguardando Validação",
  concluida: "Concluída",
  retrabalho: "Retrabalho",
  medicao: "Medição",
};

export const STATUS_COLORS: Record<OrderStatus, string> = {
  rascunho: "bg-muted text-muted-foreground",
  aguardando_aprovacao: "bg-warning/15 text-warning",
  aprovada: "bg-info/15 text-info",
  aprovada_parcial: "bg-warning/15 text-warning",
  reprovada: "bg-destructive/15 text-destructive",
  em_andamento: "bg-primary/15 text-primary",
  aguardando_validacao: "bg-warning/15 text-warning",
  concluida: "bg-success/15 text-success",
  retrabalho: "bg-destructive/15 text-destructive",
  medicao: "bg-success/15 text-success",
};
