

## Fix Employee Invite Redirect (and All Other Redirects)

### Problem
When an employee clicks "Accept Invitation" in the invite email, they get redirected to the Lovable preview URL (e.g., `olive-sanctuary-stack.lovable.app`) instead of your real site (`oliveclean.co`). This happens because the edge functions read the `origin` header from the admin's browser request — so if you triggered the invite from the Lovable preview, that preview URL gets baked into the invite link.

The same issue affects Stripe checkout redirects, customer portal returns, and invoice payment flows.

### Fix
Hardcode `https://oliveclean.co` as the site URL in all edge functions that build user-facing redirect URLs, instead of reading from `req.headers.get("origin")`.

### Files to Change

| File | Change |
|------|--------|
| `supabase/functions/invite-employee/index.ts` | Replace dynamic origin with `https://oliveclean.co` |
| `supabase/functions/finalize-invoice/index.ts` | Replace dynamic origin with `https://oliveclean.co` |
| `supabase/functions/create-invoice-payment/index.ts` | Replace dynamic origin with `https://oliveclean.co` |
| `supabase/functions/create-subscription/index.ts` | Replace dynamic origin with `https://oliveclean.co` |
| `supabase/functions/customer-portal/index.ts` | Replace dynamic origin with `https://oliveclean.co` |
| `supabase/functions/_shared/transactional-email-templates/estimate-sent.tsx` | Replace `olive-sanctuary-stack.lovable.app` fallback with `oliveclean.co` |

Each change is a one-line fix — replacing the dynamic `req.headers.get("origin")` pattern with a constant `const SITE_URL = "https://oliveclean.co"`.

