# Supabase setup — Instagram Feed MR

The preview uses a simple team name instead of email authentication. Supabase stores the team directory, approvals and comments.

## 1. Environment variables

The Vercel project must contain:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

These were configured for Preview and Production. Do not add a service-role key to the browser app.

## 2. Install the device-name schema

Open **SQL Editor → New query** in the Supabase project and run the complete contents of:

`supabase/migrations/20261126000100_device_name_feedback.sql`

This creates/upgrades:

- `team_display_names`: names that can enter the platform;
- `post_likes_by_name`: approvals linked to the selected device identity;
- `post_comments_by_name`: comments linked to the selected device identity.

The migration is safe to run if the earlier draft of the device-name migration was already applied.

## 3. Add a name

On the platform's first screen, choose **Criar usuário**, type the person's name and submit. The name becomes available for future sign-ins through **Entrar**. The browser stores the selected identity so that the same device does not need to enter it again.

To disable a name, change `enabled` to `false` in `public.team_display_names`.

## 4. Important limitation

This is a convenience gate, not identity verification. Anyone with the platform link can create a name or select an existing name. Do not use it for confidential or legally attributable approvals.
