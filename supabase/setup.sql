-- ATAS ZZP: rechten en beveiliging (RLS) voor de bestaande tabellen profiles, jobs en applications.
-- Voer dit eenmalig uit in Supabase > SQL Editor. Het script kan veilig opnieuw worden uitgevoerd.
-- Verwachte kolommen: profiles(id = auth.users.id, role, full_name, company_name, kvk_number, category, region, hourly_rate, bio),
-- jobs(id, owner_id, title, category, subcategory, region, rate_type, rate_value, duration, description, status),
-- applications(id, job_id, applicant_id, proposed_rate, message, status). De site gebruikt status 'open'/'closed' (jobs) en 'pending' (applications).

alter table public.profiles enable row level security;
alter table public.jobs enable row level security;
alter table public.applications enable row level security;

alter table public.jobs alter column status set default 'open';
alter table public.applications alter column status set default 'pending';
create unique index if not exists applications_job_applicant_uniq on public.applications (job_id, applicant_id);

-- KvK-nummer van precies 8 cijfers (bestaande rijen blijven ongemoeid: NOT VALID)
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_kvk_8_cijfers') then
    alter table public.profiles add constraint profiles_kvk_8_cijfers check (kvk_number ~ '^[0-9]{8}$' and kvk_number <> '00000000') not valid;
  end if;
end $$;

-- rechten voor de rollen van de website
grant usage on schema public to anon, authenticated;
grant select on public.profiles, public.jobs to anon, authenticated;
grant insert, update on public.profiles, public.jobs to authenticated;
grant select, insert on public.applications to authenticated;
grant update (status) on public.applications to authenticated;

-- profiles: openbaar leesbaar (ZZP-overzicht, KvK-label); iedereen beheert alleen zijn eigen profiel
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to anon, authenticated using (true);
drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles for insert to authenticated with check (id = auth.uid());
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- jobs: open klussen zijn openbaar; plaatsen kan alleen een opdrachtgever met een geldig KvK-nummer
drop policy if exists jobs_select on public.jobs;
create policy jobs_select on public.jobs for select to anon, authenticated using (status = 'open' or owner_id = auth.uid());
drop policy if exists jobs_insert on public.jobs;
create policy jobs_insert on public.jobs for insert to authenticated with check (
  owner_id = auth.uid() and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'opdrachtgever' and p.kvk_number ~ '^[0-9]{8}$' and p.kvk_number <> '00000000'));
drop policy if exists jobs_update on public.jobs;
create policy jobs_update on public.jobs for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- applications: ZZP ziet eigen aanmeldingen, opdrachtgever ziet aanmeldingen op eigen klussen; reageren alleen als ZZP op een open klus
drop policy if exists applications_select on public.applications;
create policy applications_select on public.applications for select to authenticated using (
  applicant_id = auth.uid() or exists (select 1 from public.jobs j where j.id = job_id and j.owner_id = auth.uid()));
drop policy if exists applications_insert on public.applications;
create policy applications_insert on public.applications for insert to authenticated with check (
  applicant_id = auth.uid()
  and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'zzp')
  and exists (select 1 from public.jobs j where j.id = job_id and j.status = 'open'));

-- opdrachtgever mag de status van aanmeldingen op eigen klussen wijzigen (Accepteren)
drop policy if exists applications_update on public.applications;
create policy applications_update on public.applications for update to authenticated
  using (exists (select 1 from public.jobs j where j.id = job_id and j.owner_id = auth.uid()))
  with check (exists (select 1 from public.jobs j where j.id = job_id and j.owner_id = auth.uid()));


-- AVG: gebruikers mogen hun eigen gegevens verwijderen (Gegevens verwijderen in het dashboard)
drop policy if exists profiles_delete on public.profiles;
create policy profiles_delete on public.profiles for delete to authenticated using (id = auth.uid());
drop policy if exists jobs_delete on public.jobs;
create policy jobs_delete on public.jobs for delete to authenticated using (owner_id = auth.uid());
drop policy if exists applications_delete on public.applications;
create policy applications_delete on public.applications for delete to authenticated using (applicant_id = auth.uid());
grant delete on public.profiles, public.jobs, public.applications to authenticated;

-- verwijdert het volledige account (inclusief inlogaccount) van de ingelogde gebruiker
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  if auth.uid() is null then raise exception 'Niet ingelogd'; end if;
  delete from public.applications where applicant_id = auth.uid() or job_id in (select id from public.jobs where owner_id = auth.uid());
  delete from public.jobs where owner_id = auth.uid();
  delete from public.profiles where id = auth.uid();
  delete from auth.users where id = auth.uid();
end $$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
