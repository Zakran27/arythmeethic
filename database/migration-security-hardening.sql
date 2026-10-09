-- Durcissement sécurité (Lot 0, oct. 2026)
-- Contexte : les inscriptions Supabase sont désactivées (dashboard) ; jusqu'ici tout nouvel
-- inscrit devenait admin et plusieurs tables étaient ouvertes à « tout utilisateur connecté ».
-- Les 2 comptes existants (Florence, Thomas) sont admin : aucun changement de comportement pour eux.
-- Nouvel admin : l'inviter depuis le dashboard puis `update profiles set role='admin' where email='…'`.

-- settings (barème km) : lu/écrit uniquement via la service role (/api/settings)
alter table public.settings enable row level security;
revoke all on table public.settings from anon, authenticated;

-- Nouveau compte = 'user' (plus 'admin' par défaut)
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, role) values (new.id, new.email, 'user')
  on conflict (id) do nothing;
  return new;
end $$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
alter function public.set_updated_at() set search_path = public;

-- profiles lisible par tous (emails exposés en anon), policy inutilisée
drop policy if exists "allow_email_check_for_login" on public.profiles;

-- clients : admin_clients_all (is_admin()) couvre déjà tout
drop policy if exists "Allow authenticated users to select clients" on public.clients;
drop policy if exists "Allow authenticated users to insert clients" on public.clients;
drop policy if exists "Allow authenticated users to update clients" on public.clients;
drop policy if exists "Allow authenticated users to delete clients" on public.clients;

-- « tout utilisateur connecté » → admin uniquement (lectures publiques inchangées)
alter policy "Authenticated users can manage heures_realisees" on public.heures_realisees
  using (is_admin()) with check (is_admin());
alter policy email_templates_authenticated_all on public.email_templates
  using (is_admin()) with check (is_admin());
alter policy site_messages_auth_write on public.site_messages
  using (is_admin()) with check (is_admin());
alter policy "Authenticated can read all formations" on public.formations using (is_admin());
alter policy "Authenticated can insert formations" on public.formations with check (is_admin());
alter policy "Authenticated can update formations" on public.formations
  using (is_admin()) with check (is_admin());
alter policy "Authenticated can delete formations" on public.formations using (is_admin());
alter policy "Authenticated can read all reviews" on public.google_reviews using (is_admin());
alter policy "Authenticated can insert reviews" on public.google_reviews with check (is_admin());
alter policy "Authenticated can update reviews" on public.google_reviews
  using (is_admin()) with check (is_admin());
alter policy "Authenticated can delete reviews" on public.google_reviews using (is_admin());
