# Supabase setup — Instagram Feed MR

Complete these steps once in the Supabase project connected to the Vercel app.

## 1. Authentication settings

In **Authentication → Sign In / Providers**, keep the **Email** provider enabled.

In the authentication settings, disable **Allow new users to sign up**. Team accounts must be created manually by an administrator. The application sends a magic link only to existing users (shouldCreateUser: false).

In **Authentication → URL Configuration**, set:

- Site URL: https://instagram-feed-mr.vercel.app
- Redirect URL: https://instagram-feed-mr.vercel.app/auth/callback

The redirect URL must match exactly.

## 2. Create the database tables and policies

Open **SQL Editor → New query**, paste and run the migration:

supabase/migrations/20261125000100_team_feedback.sql

The migration creates:
- team_members: explicit allowlist of users who can access the app;
- post_likes: one approval per user and Notion post;
- post_comments: comments linked to the author and Notion post;
- Row Level Security policies for all three tables.

The migration also adds the Auth users already created with an @melinaromano.com address to team_members. This includes the initial test account if it uses that domain.

## 3. Add later team accounts to the allowlist

Create each additional Auth user manually in **Authentication → Users → Add user → Create user**, with **Auto Confirm User** enabled.

After creating the users, run this query in SQL Editor to add all current corporate Auth users to the team allowlist:

```sql
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
```

The displayed name initially comes from the email prefix. It can be edited in public.team_members.display_name to show the person's preferred name.

## 4. Sign-in test

Open https://instagram-feed-mr.vercel.app, enter the existing test account's corporate email, and open the received magic link. The app should return to the feed with the signed-in email visible in the top bar.

If the feed is embedded in Notion, test the standalone URL first. Some browsers block third-party cookies or storage inside embedded pages; if the Notion embed does not retain the session, use the app link in the same browser or adjust the embedding/auth flow after testing.