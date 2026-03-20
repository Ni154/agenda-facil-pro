export type UserRole = 'superadmin' | 'admin' | 'receptionist' | 'professional' | 'cashier';

export type AppointmentStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';

export type PaymentStatus = 'pending' | 'paid' | 'cancelled';

export type PaymentMethod = 'cash' | 'credit_card' | 'debit_card' | 'pix' | 'bank_transfer';

export type StockMovementType = 'in' | 'out' | 'adjustment';

export interface Profile {
  id: string;
  full_name: string;
  avatar_url: string | null;
  created_at: string;
  is_global_admin?: boolean | null;
  email?: string | null;
}

export interface Company {
  id: string;
  name: string;
  document_number: string | null;
  logo_url: string | null;
  created_at: string;
}

export interface CompanyUser {
  id: string;
  company_id: string;
  profile_id: string;
  role: UserRole;
  status: 'active' | 'inactive';
  created_at: string;
}

export interface RolePermission {
  id: string;
  company_id: string;
  role: UserRole;
  permission: string;
  created_at: string;
}

export interface Client {
  id: string;
  company_id: string;
  full_name: string;
  document_number: string | null;
  birth_date: string | null;
  gender: string | null;
  status: string;
  created_at: string;
}

export interface ClientContact {
  id: string;
  client_id: string;
  type: string;
  value: string;
  is_primary: boolean;
  created_at: string;
}

export interface ClientAddress {
  id: string;
  client_id: string;
  street: string;
  number: string | null;
  complement: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  is_primary: boolean;
  created_at: string;
}

export interface AnamnesisForm {
  id: string;
  company_id: string;
  title: string;
  description: string | null;
  fields_json: any;
  is_active: boolean;
  created_at: string;
}

export interface AnamnesisAnswer {
  id: string;
  client_id: string;
  form_id: string;
  answers_json: any;
  professional_id: string | null;
  created_at: string;
}

export interface DigitalSignature {
  id: string;
  client_id: string;
  resource_type: string;
  resource_id: string;
  signature_data: string;
  signed_at: string;
}

export interface ServiceCategory {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export interface Service {
  id: string;
  company_id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  duration_minutes: number;
  price: number;
  status: string;
  created_at: string;
}

export interface Professional {
  id: string;
  company_id: string;
  profile_id: string | null;
  specialty: string | null;
  color_code: string | null;
  is_active: boolean;
  created_at: string;
  profile?: Profile;
}

export interface ProfessionalSchedule {
  id: string;
  professional_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
}

export interface Appointment {
  id: string;
  company_id: string;
  client_id: string;
  professional_id: string;
  start_at: string;
  end_at: string;
  status: AppointmentStatus;
  created_at: string;
  client?: Client;
  professional?: Professional;
  services?: AppointmentService[];
}

export interface AppointmentService {
  id: string;
  appointment_id: string;
  service_id: string;
  price: number;
  created_at: string;
  service?: Service;
}

export interface AppointmentStatusHistory {
  id: string;
  appointment_id: string;
  status: AppointmentStatus;
  changed_by: string | null;
  changed_at: string;
}

export interface Product {
  id: string;
  company_id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  description: string | null;
  product_type: string;
  price: number;
  cost_price: number | null;
  stock_quantity: number;
  min_stock_level: number;
  status: string;
  created_at: string;
}

export interface StockMovement {
  id: string;
  company_id: string;
  product_id: string;
  movement_type: StockMovementType;
  quantity: number;
  reason: string | null;
  movement_source: string | null;
  created_by: string | null;
  created_at: string;
}

export interface Sale {
  id: string;
  company_id: string;
  client_id: string | null;
  appointment_id: string | null;
  gross_amount: number;
  discount_amount: number;
  final_amount: number;
  status: 'completed' | 'cancelled';
  created_by: string | null;
  created_at: string;
  items?: SaleItem[];
  client?: Client;
}

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string | null;
  service_id: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface FinancialCategory {
  id: string;
  company_id: string;
  name: string;
  type: string;
  created_at: string;
}

export interface AccountPayable {
  id: string;
  company_id: string;
  amount: number;
  description: string;
  due_date: string;
  paid_at: string | null;
  status: 'pending' | 'paid' | 'cancelled';
  payment_method: string | null;
  source_type: string;
  created_at: string;
}

export interface AccountReceivable {
  id: string;
  company_id: string;
  sale_id: string | null;
  amount: number;
  description: string;
  due_date: string;
  paid_at: string | null;
  status: 'pending' | 'paid' | 'cancelled';
  payment_method: string | null;
  source_type: string;
  created_at: string;
}

export interface Payment {
  id: string;
  company_id: string;
  resource_type: string;
  resource_id: string;
  amount: number;
  method: PaymentMethod;
  paid_at: string;
}

export interface ActivityLog {
  id: string;
  company_id: string;
  user_id: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  details: any;
  created_at: string;
}
