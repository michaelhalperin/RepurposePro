-- Run this in your Supabase SQL editor

-- Users table (extends Supabase auth.users)
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  plan text not null default 'free' check (plan in ('free', 'pro')),
  usage_count integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.users enable row level security;

create policy "Users can read own row"
  on public.users for select
  using (auth.uid() = id);

create policy "Users can update own row"
  on public.users for update
  using (auth.uid() = id);

-- Generations table
create table if not exists public.generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  input_text text not null,
  output_json jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.generations enable row level security;

create policy "Users can read own generations"
  on public.generations for select
  using (auth.uid() = user_id);

create policy "Users can insert own generations"
  on public.generations for insert
  with check (auth.uid() = user_id);

-- Auto-create user row on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Saved items table
create table if not exists public.saved_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  item_type text not null check (item_type in ('tiktok', 'thread', 'linkedin')),
  item_data jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.saved_items enable row level security;

create policy "Users can read own saved items"
  on public.saved_items for select
  using (auth.uid() = user_id);

create policy "Users can insert own saved items"
  on public.saved_items for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own saved items"
  on public.saved_items for delete
  using (auth.uid() = user_id);
