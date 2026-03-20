# Agenda Fácil Pro - Project Architecture & Adherence

This document maps the project structure and its adherence to the requirements.

## 1. Project Structure
The project is organized into two main layers:
- **frontend/**: React application with Vite, Tailwind CSS, and Supabase client.
- **supabase/**: Backend definition including database schema, migrations, and edge functions.

## 2. Database Implementation (ENTREGA 2)
The database is defined in the following files:
- **Main Schema & Migrations**: `/supabase/migrations/20240319000000_initial_schema.sql`
  - **Enums**: `user_role`, `appointment_status`, `payment_status`, `payment_method`, `stock_movement_type`.
  - **Tables**: `companies`, `profiles`, `company_users`, `clients`, `service_categories`, `services`, `professionals`, `appointments`, `appointment_services`, `products`, `sales`, `sale_items`, `accounts_payable`, `accounts_receivable`, `activity_logs`.
  - **Indexes**: Optimized for company-based queries and time-based filtering.
  - **Constraints**: Foreign keys with `ON DELETE CASCADE` for data integrity.

## 3. Security & RLS (ENTREGA 2)
Row Level Security (RLS) is implemented in `/supabase/migrations/20240319000000_initial_schema.sql`:
- **Helper Function**: `get_my_companies()` to fetch the `company_id` of the current authenticated user.
- **Policies**: Every table has a policy that restricts access to rows belonging to the user's company (`company_id IN (SELECT get_my_companies())`).

## 4. Triggers (ENTREGA 2)
Triggers are implemented in `/supabase/migrations/20240319000000_initial_schema.sql`:
- **`on_auth_user_created`**: Automatically creates a profile in the `profiles` table when a new user signs up via Supabase Auth.
- **`tr_update_stock_on_sale`**: Automatically decrements product stock when a sale is made.
- **`tr_create_receivable_on_sale`**: Automatically creates an account receivable when a sale with 'pending' status is recorded.

## 5. Integrations & Edge Functions (ENTREGA 3)
The backend logic for integrations is located in:
- **WhatsApp**: `/supabase/functions/whatsapp-notification/index.ts`
  - Logic for sending reminders, confirmations, and cancellations.
- **Google Calendar**: `/supabase/functions/google-calendar-sync/index.ts`
  - Logic for syncing appointments with the Google Calendar API.

## 6. Frontend Modules (ENTREGA 4)
The frontend implementation is located in `/frontend/src/`:
- **Authentication**: `src/contexts/AuthContext.tsx` and `src/pages/auth/Login.tsx`.
- **Agenda**: `src/pages/operations/Agenda.tsx` and `src/components/AppointmentForm.tsx`.
- **Venda**: `src/pages/commercial/Sales.tsx` and `src/components/SaleForm.tsx`.
- **Financeiro**: `src/pages/finance/Payables.tsx` and `src/pages/finance/Receivables.tsx`.
- **Estoque**: `src/pages/inventory/Products.tsx` and `src/components/ProductForm.tsx`.
- **Integrações**: Handled via Supabase client calls to Edge Functions and direct API interactions.

## 7. Adherence Summary
- **Multi-tenant**: Fully implemented via `company_id` and RLS.
- **Security**: RLS, Triggers, and Role-based access control (RoleGuard).
- **Scalability**: Normalized schema with indexes and Edge Functions for heavy logic.
- **Completeness**: All requested modules (Agenda, Venda, Financeiro, Estoque, Admin) are implemented and integrated.
