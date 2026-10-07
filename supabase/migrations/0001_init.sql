-- Schema iniziale: sostituisce i dati che la v8 salvava nel localStorage del browser.
-- Eseguire una volta nel SQL editor di Supabase (o con `supabase db push`).
-- Tutte le tabelle hanno Row Level Security attiva.

-- ---------------------------------------------------------------------------
-- Profili
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  situation text not null check (situation in ('university', 'enrolling', 'curious')),
  journey_phase text check (journey_phase in ('enrolled', 'pre-enrolling')),
  university_id text,
  course_name text,
  study_year smallint check (study_year between 1 and 6),
  -- Preferenze di orientamento riusate tra gli strumenti (residenza, fascia ISEE, laurea, lingua...).
  guidance jsonb not null default '{}'::jsonb,
  -- Ruolo applicativo: predisposto per scuole e atenei (passo successivo). Non modificabile dall'utente.
  role text not null default 'student' check (role in ('student', 'teacher', 'school_admin', 'university_admin', 'admin')),
  age_confirmed_at timestamptz,
  privacy_accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profilo: lettura del proprietario" on public.profiles
  for select to authenticated using (id = (select auth.uid()));

create policy "profilo: modifica del proprietario" on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- L'utente può modificare solo i campi del proprio percorso, non ruolo né consensi.
revoke update on public.profiles from authenticated;
grant update (display_name, situation, journey_phase, university_id, course_name, study_year, guidance, updated_at)
  on public.profiles to authenticated;

-- Creazione automatica del profilo alla registrazione, dai metadati passati da signUp().
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  situation text := coalesce(meta ->> 'situation', 'curious');
begin
  insert into public.profiles (
    id, display_name, situation, journey_phase, university_id, course_name, study_year,
    age_confirmed_at, privacy_accepted_at
  ) values (
    new.id,
    split_part(coalesce(new.email, ''), '@', 1),
    case when situation in ('university', 'enrolling', 'curious') then situation else 'curious' end,
    nullif(meta ->> 'journey_phase', ''),
    nullif(meta ->> 'university_id', ''),
    nullif(meta ->> 'course_name', ''),
    nullif(meta ->> 'study_year', '')::smallint,
    case when (meta ->> 'age_confirmed')::boolean then now() end,
    case when (meta ->> 'privacy_accepted')::boolean then now() end
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Preferenze del test "Trova il mio corso"
-- ---------------------------------------------------------------------------

create table public.course_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  answers jsonb not null,
  vector jsonb not null,
  recommendations jsonb not null,
  saved_at timestamptz not null default now()
);

alter table public.course_preferences enable row level security;

create policy "preferenze: tutto al proprietario" on public.course_preferences
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Borse di studio salvate
-- ---------------------------------------------------------------------------

create table public.saved_scholarships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  university_id text not null,
  university_name text not null,
  course_name text,
  deadline date,
  portal_url text,
  status text not null check (status in ('possible', 'unlikely', 'uncertain', 'unknown')),
  status_label text not null,
  saved_at timestamptz not null default now()
);

create index saved_scholarships_user_idx on public.saved_scholarships (user_id);
alter table public.saved_scholarships enable row level security;

create policy "borse: tutto al proprietario" on public.saved_scholarships
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Contesti scelti negli strumenti (ateneo/corso per scadenze, community, libri, burocrazia)
-- ---------------------------------------------------------------------------

create table public.user_contexts (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind text not null check (kind in ('deadlines', 'community', 'books', 'bureaucracy')),
  university_id text not null,
  course_name text not null default '',
  saved_at timestamptz not null default now(),
  primary key (user_id, kind)
);

alter table public.user_contexts enable row level security;

create policy "contesti: tutto al proprietario" on public.user_contexts
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Community
-- ---------------------------------------------------------------------------

create table public.community_messages (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  author_alias text not null check (char_length(author_alias) between 1 and 60),
  university_id text not null,
  course_name text not null default '',
  body text not null check (char_length(body) between 1 and 800),
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);

create index community_messages_group_idx on public.community_messages (university_id, created_at desc);
alter table public.community_messages enable row level security;

create policy "community: lettura per utenti registrati" on public.community_messages
  for select to authenticated using (not hidden or author_id = (select auth.uid()));

create policy "community: pubblicazione a proprio nome" on public.community_messages
  for insert to authenticated with check (author_id = (select auth.uid()) and hidden = false);

create policy "community: cancellazione dell'autore" on public.community_messages
  for delete to authenticated using (author_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Libri usati
-- ---------------------------------------------------------------------------

create table public.book_listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  seller_alias text not null check (char_length(seller_alias) between 1 and 60),
  university_id text not null,
  course_name text not null check (char_length(course_name) > 0),
  type text not null check (type in ('sell', 'buy')),
  title text not null check (char_length(title) between 1 and 200),
  author text not null default '' check (char_length(author) <= 200),
  price numeric(8, 2) check (price >= 0),
  condition text not null default '' check (char_length(condition) <= 60),
  notes text not null default '' check (char_length(notes) <= 300),
  -- Recapito scelto dal venditore e visibile agli utenti registrati (nessuna email esposta d'ufficio).
  contact text not null default '' check (char_length(contact) <= 120),
  status text not null default 'active' check (status in ('active', 'closed')),
  created_at timestamptz not null default now()
);

create index book_listings_group_idx on public.book_listings (university_id, course_name, created_at desc);
alter table public.book_listings enable row level security;

create policy "libri: lettura per utenti registrati" on public.book_listings
  for select to authenticated using (status = 'active' or seller_id = (select auth.uid()));

create policy "libri: pubblicazione a proprio nome" on public.book_listings
  for insert to authenticated with check (seller_id = (select auth.uid()));

create policy "libri: modifica del venditore" on public.book_listings
  for update to authenticated using (seller_id = (select auth.uid())) with check (seller_id = (select auth.uid()));

create policy "libri: cancellazione del venditore" on public.book_listings
  for delete to authenticated using (seller_id = (select auth.uid()));
