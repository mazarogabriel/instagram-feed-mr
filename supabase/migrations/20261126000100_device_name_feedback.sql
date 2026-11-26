-- Device-based names and post feedback for the MR/LAB preview.
-- Run in Supabase Dashboard > SQL Editor after deploying this branch.

create table if not exists public.team_display_names (
  display_name text primary key,
  actor_id text,
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

-- Upgrade safely if the earlier draft of this migration was already applied.
alter table public.team_display_names
  add column if not exists actor_id text;

update public.team_display_names
set actor_id = gen_random_uuid()::text
where actor_id is null;

alter table public.team_display_names
  alter column actor_id set not null;

create unique index if not exists team_display_names_actor_id_uidx
  on public.team_display_names (actor_id);

create unique index if not exists team_display_names_lower_name_uidx
  on public.team_display_names (lower(display_name));

create table if not exists public.post_likes_by_name (
  post_id uuid not null,
  actor_id text not null check (char_length(actor_id) between 16 and 80),
  display_name text not null references public.team_display_names(display_name),
  created_at timestamptz not null default now(),
  primary key (post_id, actor_id)
);

create table if not exists public.post_comments_by_name (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null,
  actor_id text not null check (char_length(actor_id) between 16 and 80),
  display_name text not null references public.team_display_names(display_name),
  body text not null check (char_length(trim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index if not exists post_comments_by_name_post_created_idx
  on public.post_comments_by_name (post_id, created_at);

alter table public.team_display_names enable row level security;
alter table public.post_likes_by_name enable row level security;
alter table public.post_comments_by_name enable row level security;

drop policy if exists "Anyone can read enabled team display names" on public.team_display_names;
create policy "Anyone can read enabled team display names"
  on public.team_display_names
  for select
  to anon, authenticated
  using (enabled = true);

drop policy if exists "Anyone can create a team display name" on public.team_display_names;
create policy "Anyone can create a team display name"
  on public.team_display_names
  for insert
  to anon, authenticated
  with check (
    enabled = true
    and char_length(trim(display_name)) between 2 and 40
    and actor_id is not null
  );

drop policy if exists "Anyone can read named post likes" on public.post_likes_by_name;
create policy "Anyone can read named post likes"
  on public.post_likes_by_name
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Anyone can add a named post like" on public.post_likes_by_name;
create policy "Anyone can add a named post like"
  on public.post_likes_by_name
  for insert
  to anon, authenticated
  with check (
    exists (
      select 1 from public.team_display_names as member
      where member.actor_id = post_likes_by_name.actor_id
        and member.display_name = post_likes_by_name.display_name
        and member.enabled = true
    )
  );

drop policy if exists "Anyone can remove a named post like" on public.post_likes_by_name;
create policy "Anyone can remove a named post like"
  on public.post_likes_by_name
  for delete
  to anon, authenticated
  using (true);

drop policy if exists "Anyone can read named post comments" on public.post_comments_by_name;
create policy "Anyone can read named post comments"
  on public.post_comments_by_name
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Anyone can add a named post comment" on public.post_comments_by_name;
create policy "Anyone can add a named post comment"
  on public.post_comments_by_name
  for insert
  to anon, authenticated
  with check (
    exists (
      select 1 from public.team_display_names as member
      where member.actor_id = post_comments_by_name.actor_id
        and member.display_name = post_comments_by_name.display_name
        and member.enabled = true
    )
  );

drop policy if exists "Anyone can remove a named post comment" on public.post_comments_by_name;
create policy "Anyone can remove a named post comment"
  on public.post_comments_by_name
  for delete
  to anon, authenticated
  using (true);

grant usage on schema public to anon, authenticated;
grant select, insert on public.team_display_names to anon, authenticated;
grant select, insert, delete on public.post_likes_by_name to anon, authenticated;
grant select, insert, delete on public.post_comments_by_name to anon, authenticated;

revoke all on public.team_display_names from public;
revoke all on public.post_likes_by_name from public;
revoke all on public.post_comments_by_name from public;
