-- Melina Romano / LAB MR: team access, post approvals and comments.
-- Run once in Supabase Dashboard > SQL Editor.
-- Only users created by an administrator and belonging to @melinaromano.com
-- are registered as team members. Keep public sign-ups disabled in Auth settings.

create table if not exists public.team_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  display_name text not null default '',
  created_at timestamptz not null default now()
);

-- Team membership is an explicit allowlist. Users are not added automatically.\n-- Create each auth user in the Dashboard, then run the backfill below.\n\n-- Backfill users created before this migration (including the initial test user).
insert into public.team_members (user_id, email, display_name)
select
  id,
  lower(email),
  coalesce(
    nullif(raw_user_meta_data ->> 'full_name', ''),
    split_part(lower(email), '@', 1)
  )
from auth.users
where email is not null
  and lower(email) like '%@melinaromano.com'
on conflict (user_id) do update
  set email = excluded.email;

create table if not exists public.post_likes (
  post_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index if not exists post_comments_post_created_idx
  on public.post_comments (post_id, created_at);

create or replace function public.is_team_member()
returns boolean
language sql
stable
security definer
set search_path = ''
as $
  select exists (
    select 1
    from public.team_members
    where user_id = auth.uid()
  );
$$;

alter table public.team_members enable row level security;
alter table public.post_likes enable row level security;
alter table public.post_comments enable row level security;

drop policy if exists "Team members can read team directory" on public.team_members;
create policy "Team members can read team directory"
  on public.team_members
  for select
  to authenticated
  using (public.is_team_member());

drop policy if exists "Team members can read post likes" on public.post_likes;
create policy "Team members can read post likes"
  on public.post_likes
  for select
  to authenticated
  using (public.is_team_member());

drop policy if exists "Team members can add their own likes" on public.post_likes;
create policy "Team members can add their own likes"
  on public.post_likes
  for insert
  to authenticated
  with check (user_id = auth.uid() and public.is_team_member());

drop policy if exists "Team members can remove their own likes" on public.post_likes;
create policy "Team members can remove their own likes"
  on public.post_likes
  for delete
  to authenticated
  using (user_id = auth.uid() and public.is_team_member());

drop policy if exists "Team members can read post comments" on public.post_comments;
create policy "Team members can read post comments"
  on public.post_comments
  for select
  to authenticated
  using (public.is_team_member());

drop policy if exists "Team members can add their own comments" on public.post_comments;
create policy "Team members can add their own comments"
  on public.post_comments
  for insert
  to authenticated
  with check (user_id = auth.uid() and public.is_team_member());

drop policy if exists "Authors can edit their own comments" on public.post_comments;
create policy "Authors can edit their own comments"
  on public.post_comments
  for update
  to authenticated
  using (user_id = auth.uid() and public.is_team_member())
  with check (user_id = auth.uid() and public.is_team_member());

drop policy if exists "Authors can delete their own comments" on public.post_comments;
create policy "Authors can delete their own comments"
  on public.post_comments
  for delete
  to authenticated
  using (user_id = auth.uid() and public.is_team_member());

grant usage on schema public to authenticated;\ngrant select on public.team_members to authenticated;\nrevoke all on function public.is_team_member() from public, anon;\ngrant execute on function public.is_team_member() to authenticated;
grant select, insert, delete on public.post_likes to authenticated;
grant select, insert, update, delete on public.post_comments to authenticated;

revoke all on public.team_members from anon;
revoke all on public.post_likes from anon;
revoke all on public.post_comments from anon;
