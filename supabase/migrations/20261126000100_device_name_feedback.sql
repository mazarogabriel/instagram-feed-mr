-- Device-based display names for the internal MR/LAB feedback preview.
-- Run once in Supabase Dashboard > SQL Editor.

create table if not exists public.team_display_names (
  display_name text primary key,
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

-- Initial options. Add the remaining team names here or through SQL Editor.
insert into public.team_display_names (display_name, enabled)
values ('Gabriel', true), ('Melina', true)
on conflict (display_name) do update set enabled = excluded.enabled;

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
      where member.display_name = post_likes_by_name.display_name
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
      where member.display_name = post_comments_by_name.display_name
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
grant select on public.team_display_names to anon, authenticated;
grant select, insert, delete on public.post_likes_by_name to anon, authenticated;
grant select, insert, delete on public.post_comments_by_name to anon, authenticated;

revoke all on public.team_display_names from public;
revoke all on public.post_likes_by_name from public;
revoke all on public.post_comments_by_name from public;
