-- ATAS ZZP v2 (wizard, postcode, Wet DBA): voer dit eenmalig uit in Supabase > SQL Editor (nieuw project).
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  rol text not null check (rol in ('opdrachtgever','zzp')),
  bedrijf text not null check (char_length(bedrijf) between 2 and 80),
  naam text not null check (char_length(naam) between 2 and 80),
  kvk text not null check (kvk ~ '^[0-9]{8}$' and kvk <> '00000000'),
  sector text,
  postcode text check (postcode is null or postcode ~ '^[1-9][0-9]{3}[A-Z]{2}$'),
  plaats text, lat double precision, lon double precision,
  uurtarief numeric check (uurtarief is null or uurtarief between 0 and 1000),
  zichtbaar boolean not null default false,
  vca boolean not null default false, avb boolean not null default false, dba_model boolean not null default false,   -- zelf verklaard door het lid
  kvk_geverifieerd boolean not null default false,   -- alleen door beheer te zetten na controle op kvk.nl
  docs_geverifieerd boolean not null default false,  -- alleen door beheer: VCA, AVB en Modelovereenkomst-documenten gecontroleerd
  created_at timestamptz not null default now(),
  check (rol <> 'zzp' or postcode is not null)
);
create table public.listings (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references public.profiles(id) on delete cascade,
  titel text not null check (char_length(titel) between 3 and 100),
  soort text not null default 'ZZP-opdracht',
  categorie text not null, subklus text not null,
  eenheid text not null default 'm2' check (eenheid in ('m2','uur')),
  oppervlak numeric not null check (oppervlak > 0),
  kamers int not null default 1 check (kamers between 1 and 50),
  materiaal text not null default 'exclusief' check (materiaal in ('inclusief','exclusief')),
  spoed boolean not null default false,
  budget_min numeric, budget_max numeric,
  postcode text not null check (postcode ~ '^[1-9][0-9]{3}[A-Z]{2}$'),
  plaats text not null, provincie text, regio text, sector text,
  lat double precision, lon double precision,
  omschrijving text not null check (char_length(omschrijving) between 20 and 4000),
  fotos jsonb not null default '[]' check (jsonb_typeof(fotos) = 'array' and jsonb_array_length(fotos) <= 3),
  dba_bevestigd boolean not null check (dba_bevestigd),   -- Wet DBA-controle is verplicht
  status text not null default 'open' check (status in ('open','gesloten')),
  valid_through date not null,
  kvk text not null check (kvk ~ '^[0-9]{8}$' and kvk <> '00000000'),
  created_at timestamptz not null default now()
);
create table public.applications (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  zzp_id uuid not null references public.profiles(id) on delete cascade,
  bericht text not null check (char_length(bericht) between 5 and 2000),
  tarief numeric check (tarief is null or tarief >= 0),
  contact_email text not null,
  created_at timestamptz not null default now(),
  unique (listing_id, zzp_id)
);

-- Profiel wordt bij registratie aangemaakt; een ongeldig KvK-nummer of postcode laat de registratie mislukken.
create function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, rol, bedrijf, naam, kvk, sector, postcode, plaats, lat, lon, uurtarief, zichtbaar, vca, avb, dba_model)
  values (new.id, new.raw_user_meta_data->>'rol', new.raw_user_meta_data->>'bedrijf', new.raw_user_meta_data->>'naam',
          new.raw_user_meta_data->>'kvk', new.raw_user_meta_data->>'sector', nullif(new.raw_user_meta_data->>'postcode',''),
          nullif(new.raw_user_meta_data->>'plaats',''), nullif(new.raw_user_meta_data->>'lat','')::double precision, nullif(new.raw_user_meta_data->>'lon','')::double precision,
          nullif(new.raw_user_meta_data->>'uurtarief','')::numeric, coalesce((new.raw_user_meta_data->>'zichtbaar')::boolean,false),
          coalesce((new.raw_user_meta_data->>'vca')::boolean,false), coalesce((new.raw_user_meta_data->>'avb')::boolean,false), coalesce((new.raw_user_meta_data->>'dba_model')::boolean,false));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- KvK van de klus komt altijd uit het profiel van de opdrachtgever en is daarna onveranderlijk.
create function public.listing_guard() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    select kvk into new.kvk from public.profiles where id = new.owner and rol = 'opdrachtgever';
    if new.kvk is null then raise exception 'Alleen opdrachtgevers met een geldig KvK-nummer mogen plaatsen'; end if;
  else new.kvk := old.kvk; new.owner := old.owner; end if;
  return new;
end $$;
create trigger listing_guard_t before insert or update on public.listings for each row execute function public.listing_guard();

alter table public.profiles enable row level security;
alter table public.listings enable row level security;
alter table public.applications enable row level security;

create policy profiles_select on public.profiles for select to anon, authenticated using (
  id = auth.uid() or rol = 'opdrachtgever' or (rol = 'zzp' and zichtbaar) or
  exists (select 1 from public.applications a join public.listings l on l.id = a.listing_id where a.zzp_id = profiles.id and l.owner = auth.uid()));
create policy profiles_update on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
revoke update on public.profiles from authenticated;
grant update (bedrijf, naam, sector, postcode, plaats, lat, lon, uurtarief, zichtbaar, vca, avb, dba_model) on public.profiles to authenticated;

create policy listings_select on public.listings for select to anon, authenticated using (status = 'open' or owner = auth.uid());
create policy listings_insert on public.listings for insert to authenticated with check (owner = auth.uid());
create policy listings_update on public.listings for update to authenticated using (owner = auth.uid()) with check (owner = auth.uid());
revoke update on public.listings from authenticated;
grant update (titel, omschrijving, valid_through, status) on public.listings to authenticated;

create policy apps_select on public.applications for select to authenticated using (
  zzp_id = auth.uid() or exists (select 1 from public.listings l where l.id = listing_id and l.owner = auth.uid()));
create policy apps_insert on public.applications for insert to authenticated with check (
  zzp_id = auth.uid()
  and exists (select 1 from public.profiles p where p.id = auth.uid() and p.rol = 'zzp')
  and exists (select 1 from public.listings l where l.id = listing_id and l.status = 'open'));
