-- Durcissement sécurité (Lot 1, nov. 2026) : MFA dans les policies + types du bucket.

-- 1. is_admin() exige le code MFA (aal2) pour un compte qui a activé la double authentification
--    (/admin/securite). Sans facteur vérifié : comportement inchangé. Couvre toutes les policies
--    (tables + storage) qui appellent is_admin(), donc aussi les appels directs à l'API Supabase.
create or replace function public.is_admin() returns boolean
language plpgsql security definer set search_path to 'public' as $function$
begin
  return exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
    and (
      coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
      or not exists (
        select 1 from auth.mfa_factors where user_id = auth.uid() and status = 'verified'
      )
    );
end;
$function$;

-- 2. procedure_status_history : la seule policy qui lisait profiles.role sans passer par is_admin()
alter policy admin_procedure_status_history_all on public.procedure_status_history
  using (is_admin()) with check (is_admin());

-- 3. Bucket client-files : seulement les types attendus (PDF, images, bureautique). Bloque HTML / SVG
--    servis depuis le domaine Supabase. text/plain : type envoyé par le navigateur quand il n'en
--    connaît pas (jamais interprété comme une page).
update storage.buckets set allowed_mime_types = array[
  'application/pdf',
  'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'image/gif',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.oasis.opendocument.text',
  'application/vnd.oasis.opendocument.spreadsheet',
  'application/vnd.oasis.opendocument.presentation',
  'text/plain'
] where id = 'client-files';
