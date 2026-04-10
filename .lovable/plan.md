

## Fix Auth Email Sender Name

### Problem
The invitation email shows "From olive-sanctuary-stack" instead of "Olive Clean". This is because the `SITE_NAME` constant in `supabase/functions/auth-email-hook/index.ts` was set to the project slug during scaffolding instead of the brand name.

### Change

**`supabase/functions/auth-email-hook/index.ts`** (line 39):
- Change `const SITE_NAME = "olive-sanctuary-stack"` → `const SITE_NAME = "Olive Clean"`

Then redeploy the `auth-email-hook` edge function so the change takes effect.

After this, invitation and all auth emails will show **"From: Olive Clean \<noreply@oliveclean.co\>"** instead of "olive-sanctuary-stack".

