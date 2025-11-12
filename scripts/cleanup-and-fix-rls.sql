-- Complete RLS policy cleanup and fix
-- This removes all old policies and creates only the correct ones

-- ============================================
-- PROFILES TABLE - SECURITY DEFINER FUNCTION
-- ============================================
-- Create a security definer function to check if user is admin
-- This bypasses RLS to avoid infinite recursion
create or replace function public.is_admin()
returns boolean as $$
begin
  return exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
end;
$$ language plpgsql security definer set search_path = public;

-- Drop all existing policies
drop policy if exists "admin_profiles_read" on public.profiles;
drop policy if exists "admin_all_profiles" on public.profiles;
drop policy if exists "admin_select_profiles" on public.profiles;
drop policy if exists "users_read_own_profile" on public.profiles;
drop policy if exists "admins_read_all_profiles" on public.profiles;
drop policy if exists "allow_email_check_for_login" on public.profiles;

-- Create correct policies (no infinite recursion)
create policy "users_read_own_profile" on public.profiles
  for select using (auth.uid() = id);

create policy "admins_read_all_profiles" on public.profiles
  for select using (public.is_admin());

-- Allow unauthenticated users to check if email exists (for login validation)
create policy "allow_email_check_for_login" on public.profiles
  for select using (true);

-- ============================================
-- CLIENTS TABLE
-- ============================================
drop policy if exists "admin_clients_all" on public.clients;
drop policy if exists "admin_all_clients" on public.clients;
drop policy if exists "admin_select_clients" on public.clients;

create policy "admin_clients_all" on public.clients
  for all using (public.is_admin());

-- ============================================
-- PROCEDURE_TYPES TABLE
-- ============================================
drop policy if exists "admin_procedure_types_all" on public.procedure_types;
drop policy if exists "admin_all_procedure_types" on public.procedure_types;
drop policy if exists "admin_select_procedure_types" on public.procedure_types;

create policy "admin_procedure_types_all" on public.procedure_types
  for all using (public.is_admin());

-- ============================================
-- PROCEDURES TABLE
-- ============================================
drop policy if exists "admin_procedures_all" on public.procedures;
drop policy if exists "admin_all_procedures" on public.procedures;
drop policy if exists "admin_select_procedures" on public.procedures;

create policy "admin_procedures_all" on public.procedures
  for all using (public.is_admin());

-- ============================================
-- DOCUMENTS TABLE
-- ============================================
drop policy if exists "admin_documents_all" on public.documents;
drop policy if exists "admin_all_documents" on public.documents;
drop policy if exists "admin_select_documents" on public.documents;

create policy "admin_documents_all" on public.documents
  for all using (public.is_admin());

-- ============================================
-- AUDIT_LOG TABLE
-- ============================================
drop policy if exists "admin_audit_log_read" on public.audit_log;
drop policy if exists "admin_all_audit_log" on public.audit_log;
drop policy if exists "admin_select_audit_log" on public.audit_log;

create policy "admin_audit_log_read" on public.audit_log
  for select using (public.is_admin());
