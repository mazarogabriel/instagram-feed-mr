-- Allow the app to update comment text.
-- The client additionally filters by the current device actor_id.
grant update on public.post_comments_by_name to anon, authenticated;

drop policy if exists "Anyone can update named post comments" on public.post_comments_by_name;
create policy "Anyone can update named post comments"
  on public.post_comments_by_name
  for update to anon, authenticated
  using (true)
  with check (
    char_length(trim(body)) between 1 and 2000
    and actor_id is not null
    and display_name is not null
  );
