-- ===============================================================
-- AGENDA FÁCIL PRO - FINAL APPROVED SCHEMA
-- Migration: 20240319000000_initial_schema.sql
-- ===============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 1. ENUMS
-- ==========================================

CREATE TYPE public.user_role AS ENUM (
    'superadmin',
    'admin',
    'receptionist',
    'professional',
    'cashier'
);

CREATE TYPE public.appointment_status AS ENUM (
    'pending',
    'confirmed',
    'completed',
    'cancelled'
);

CREATE TYPE public.payment_status AS ENUM (
    'pending',
    'paid',
    'cancelled'
);

CREATE TYPE public.payment_method AS ENUM (
    'cash',
    'credit_card',
    'debit_card',
    'pix',
    'bank_transfer'
);

CREATE TYPE public.stock_movement_type AS ENUM (
    'in',
    'out',
    'adjustment'
);

-- ==========================================
-- 2. TABLES
-- ==========================================

-- Companies
CREATE TABLE public.companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    document_number TEXT,
    status TEXT NOT NULL DEFAULT 'active', -- active, inactive, suspended
    logo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Profiles
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    avatar_url TEXT,
    is_global_admin BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Company Users
CREATE TABLE public.company_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role public.user_role NOT NULL DEFAULT 'professional',
    status TEXT NOT NULL DEFAULT 'active', -- active, inactive
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(company_id, profile_id)
);

-- Role Permissions
CREATE TABLE public.role_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    role public.user_role NOT NULL,
    permission TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(company_id, role, permission)
);

-- Clients
CREATE TABLE public.clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    document_number TEXT,
    birth_date DATE,
    gender TEXT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Client Contacts
CREATE TABLE public.client_contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- email, phone, whatsapp
    value TEXT NOT NULL,
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Client Addresses
CREATE TABLE public.client_addresses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    street TEXT NOT NULL,
    number TEXT,
    complement TEXT,
    neighborhood TEXT,
    city TEXT,
    state TEXT,
    zip_code TEXT,
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Anamnesis Forms
CREATE TABLE public.anamnesis_forms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    fields_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Anamnesis Answers
CREATE TABLE public.anamnesis_answers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    form_id UUID NOT NULL REFERENCES public.anamnesis_forms(id) ON DELETE CASCADE,
    answers_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    professional_id UUID,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Digital Signatures
CREATE TABLE public.digital_signatures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    resource_type TEXT NOT NULL, -- anamnesis, contract, etc
    resource_id UUID NOT NULL,
    signature_data TEXT NOT NULL, -- base64 or path
    signed_at TIMESTAMPTZ DEFAULT now()
);

-- Service Categories
CREATE TABLE public.service_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Services
CREATE TABLE public.services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.service_categories(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    description TEXT,
    duration_minutes INTEGER NOT NULL DEFAULT 30,
    price DECIMAL(12,2) NOT NULL DEFAULT 0,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Professionals
CREATE TABLE public.professionals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    specialty TEXT,
    color_code TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Professional Schedules
CREATE TABLE public.professional_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    professional_id UUID NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_active BOOLEAN DEFAULT true
);

-- Appointments
CREATE TABLE public.appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    professional_id UUID NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ NOT NULL,
    status public.appointment_status DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Appointment Services
CREATE TABLE public.appointment_services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
    price DECIMAL(12,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Appointment Status History
CREATE TABLE public.appointment_status_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
    status public.appointment_status NOT NULL,
    changed_by UUID REFERENCES public.profiles(id),
    changed_at TIMESTAMPTZ DEFAULT now()
);

-- Products
CREATE TABLE public.products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    sku TEXT,
    barcode TEXT,
    description TEXT,
    product_type TEXT DEFAULT 'resale', -- resale, internal_use, supply
    price DECIMAL(12,2) NOT NULL DEFAULT 0,
    cost_price DECIMAL(12,2) DEFAULT 0,
    stock_quantity INTEGER DEFAULT 0,
    min_stock_level INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Stock Movements
CREATE TABLE public.stock_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    type public.stock_movement_type NOT NULL,
    quantity INTEGER NOT NULL,
    reason TEXT,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Sales
CREATE TABLE public.sales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
    gross_amount DECIMAL(12,2) NOT NULL,
    discount_amount DECIMAL(12,2) DEFAULT 0,
    final_amount DECIMAL(12,2) NOT NULL,
    status TEXT DEFAULT 'completed', -- completed, cancelled
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Sale Items
CREATE TABLE public.sale_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(12,2) NOT NULL,
    total_price DECIMAL(12,2) NOT NULL
);

-- Financial Categories
CREATE TABLE public.financial_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- income, expense
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Accounts Payable
CREATE TABLE public.accounts_payable (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    amount DECIMAL(12,2) NOT NULL,
    description TEXT NOT NULL,
    due_date DATE NOT NULL,
    paid_at TIMESTAMPTZ,
    status TEXT DEFAULT 'pending', -- pending, paid, cancelled
    payment_method TEXT,
    source_type TEXT DEFAULT 'manual', -- purchase, manual
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Accounts Receivable
CREATE TABLE public.accounts_receivable (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    sale_id UUID REFERENCES public.sales(id) ON DELETE CASCADE,
    amount DECIMAL(12,2) NOT NULL,
    description TEXT NOT NULL,
    due_date DATE NOT NULL,
    paid_at TIMESTAMPTZ,
    status TEXT DEFAULT 'pending', -- pending, paid, cancelled
    payment_method TEXT,
    source_type TEXT DEFAULT 'sale', -- sale, manual
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Payments
CREATE TABLE public.payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    resource_type TEXT NOT NULL, -- sale, payable, receivable
    resource_id UUID NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    method public.payment_method NOT NULL,
    paid_at TIMESTAMPTZ DEFAULT now()
);

-- Activity Logs
CREATE TABLE public.activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id UUID,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ==========================================
-- 3. RLS POLICIES
-- ==========================================

-- Enable RLS
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anamnesis_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anamnesis_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.digital_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professionals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professional_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointment_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointment_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts_payable ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts_receivable ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Helper function
CREATE OR REPLACE FUNCTION public.get_my_companies()
RETURNS SETOF UUID AS $$
  SELECT company_id FROM public.company_users WHERE profile_id = auth.uid() AND status = 'active';
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Policies
CREATE POLICY "Company isolation" ON public.companies FOR SELECT USING (id IN (SELECT public.get_my_companies()));
CREATE POLICY "Profile self access" ON public.profiles FOR ALL USING (id = auth.uid());
CREATE POLICY "Company users isolation" ON public.company_users FOR ALL USING (company_id IN (SELECT public.get_my_companies()));
CREATE POLICY "Role permissions isolation" ON public.role_permissions FOR ALL USING (company_id IN (SELECT public.get_my_companies()));
CREATE POLICY "Clients isolation" ON public.clients FOR ALL USING (company_id IN (SELECT public.get_my_companies()));
CREATE POLICY "Client contacts isolation" ON public.client_contacts FOR ALL USING (client_id IN (SELECT id FROM public.clients WHERE company_id IN (SELECT public.get_my_companies())));
CREATE POLICY "Client addresses isolation" ON public.client_addresses FOR ALL USING (client_id IN (SELECT id FROM public.clients WHERE company_id IN (SELECT public.get_my_companies())));
CREATE POLICY "Anamnesis forms isolation" ON public.anamnesis_forms FOR ALL USING (company_id IN (SELECT public.get_my_companies()));
CREATE POLICY "Anamnesis answers isolation" ON public.anamnesis_answers FOR ALL USING (client_id IN (SELECT id FROM public.clients WHERE company_id IN (SELECT public.get_my_companies())));
CREATE POLICY "Digital signatures isolation" ON public.digital_signatures FOR ALL USING (client_id IN (SELECT id FROM public.clients WHERE company_id IN (SELECT public.get_my_companies())));
CREATE POLICY "Service categories isolation" ON public.service_categories FOR ALL USING (company_id IN (SELECT public.get_my_companies()));
CREATE POLICY "Services isolation" ON public.services FOR ALL USING (company_id IN (SELECT public.get_my_companies()));
CREATE POLICY "Professionals isolation" ON public.professionals FOR ALL USING (company_id IN (SELECT public.get_my_companies()));
CREATE POLICY "Professional schedules isolation" ON public.professional_schedules FOR ALL USING (professional_id IN (SELECT id FROM public.professionals WHERE company_id IN (SELECT public.get_my_companies())));
CREATE POLICY "Appointments isolation" ON public.appointments FOR ALL USING (company_id IN (SELECT public.get_my_companies()));
CREATE POLICY "Appointment services isolation" ON public.appointment_services FOR ALL USING (appointment_id IN (SELECT id FROM public.appointments WHERE company_id IN (SELECT public.get_my_companies())));
CREATE POLICY "Appointment status history isolation" ON public.appointment_status_history FOR ALL USING (appointment_id IN (SELECT id FROM public.appointments WHERE company_id IN (SELECT public.get_my_companies())));
CREATE POLICY "Products isolation" ON public.products FOR ALL USING (company_id IN (SELECT public.get_my_companies()));
CREATE POLICY "Stock movements isolation" ON public.stock_movements FOR ALL USING (company_id IN (SELECT public.get_my_companies()));
CREATE POLICY "Sales isolation" ON public.sales FOR ALL USING (company_id IN (SELECT public.get_my_companies()));
CREATE POLICY "Sale items isolation" ON public.sale_items FOR ALL USING (sale_id IN (SELECT id FROM public.sales WHERE company_id IN (SELECT public.get_my_companies())));
CREATE POLICY "Financial categories isolation" ON public.financial_categories FOR ALL USING (company_id IN (SELECT public.get_my_companies()));
CREATE POLICY "Accounts payable isolation" ON public.accounts_payable FOR ALL USING (company_id IN (SELECT public.get_my_companies()));
CREATE POLICY "Accounts receivable isolation" ON public.accounts_receivable FOR ALL USING (company_id IN (SELECT public.get_my_companies()));
CREATE POLICY "Payments isolation" ON public.payments FOR ALL USING (company_id IN (SELECT public.get_my_companies()));
CREATE POLICY "Activity logs isolation" ON public.activity_logs FOR ALL USING (company_id IN (SELECT public.get_my_companies()));

-- ==========================================
-- 4. TRIGGERS
-- ==========================================

-- Profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (new.id, COALESCE(new.raw_user_meta_data->>'full_name', new.email));
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Stock update
CREATE OR REPLACE FUNCTION public.update_stock_on_movement()
RETURNS trigger AS $$
BEGIN
  IF (new.type = 'in') THEN
    UPDATE public.products SET stock_quantity = stock_quantity + new.quantity WHERE id = new.product_id;
  ELSIF (new.type = 'out') THEN
    UPDATE public.products SET stock_quantity = stock_quantity - new.quantity WHERE id = new.product_id;
  END IF;
  RETURN new;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_update_stock_on_movement
  AFTER INSERT ON public.stock_movements
  FOR EACH ROW EXECUTE PROCEDURE public.update_stock_on_movement();
