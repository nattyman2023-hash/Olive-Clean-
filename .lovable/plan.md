

# Fix Email Sender Display Name

## Problem
The `From:` header in sent emails shows **olive-sanctuary-stack** instead of **Olive Clean** because the `SITE_NAME` constant in the send function was set to the project slug during scaffolding.

## Fix

### `supabase/functions/send-transactional-email/index.ts`
Change line:
```typescript
const SITE_NAME = "olive-sanctuary-stack"
```
to:
```typescript
const SITE_NAME = "Olive Clean"
```

This single change updates the `From:` header (`Olive Clean <noreply@oliveclean.co>`) for all future transactional emails.

### Redeploy
Deploy the updated edge function so the change takes effect.

### Files modified
- `supabase/functions/send-transactional-email/index.ts`

