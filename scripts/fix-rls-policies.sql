-- Fix infinite recursion in profiles RLS policy
-- Drop the problematic policy
drop policy if exists "admin_profiles_read" on public.profiles;

-- Create a simple policy that allows users to read their own profile
create policy "users_read_own_profile" on public.profiles
  for select using (auth.uid() = id);

-- Optionally, allow admins to read all profiles (without recursion)
create policy "admins_read_all_profiles" on public.profiles
  for select using (
    (select role from public.profiles where id = auth.uid()) = 'admin'
  );

-- Drop and recreate other policies to avoid the same issue
drop policy if exists "admin_clients_all" on public.clients;
drop policy if exists "admin_procedure_types_all" on public.procedure_types;
drop policy if exists "admin_procedures_all" on public.procedures;
drop policy if exists "admin_documents_all" on public.documents;
drop policy if exists "admin_audit_log_read" on public.audit_log;

-- Better policies that check role directly
create policy "admin_clients_all" on public.clients
  for all using ((select role from public.profiles where id = auth.uid()) = 'admin');

create policy "admin_procedure_types_all" on public.procedure_types
  for all using ((select role from public.profiles where id = auth.uid()) = 'admin');

create policy "admin_procedures_all" on public.procedures
  for all using ((select role from public.profiles where id = auth.uid()) = 'admin');

create policy "admin_documents_all" on public.documents
  for all using ((select role from public.profiles where id = auth.uid()) = 'admin');

create policy "admin_audit_log_read" on public.audit_log
  for select using ((select role from public.profiles where id = auth.uid()) = 'admin');
