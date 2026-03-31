

# Auth Email Templates + Welcome Email

## What We'll Build

1. **Branded auth email templates** — Password reset, signup verification, magic link, invite, email change, and reauthentication emails styled with Olive Clean branding (olive-moss green, coral-sunset accent, Poppins font)
2. **Welcome email** — A new transactional template sent after a client signs up, welcoming them to Olive Clean

## Implementation Steps

### Step 1: Scaffold auth email templates
Use the built-in scaffolding to create the 6 auth email template files in `_shared/email-templates/` and the `auth-email-hook` edge function.

### Step 2: Brand the auth templates
Apply Olive Clean styling to all 6 templates:
- **Primary button**: `#7a8a3a` (olive-moss) with white text
- **Accent**: `#e88b6e` (coral-sunset)
- **Text color**: `#2e2e2e` (charcoal)
- **Muted text**: `#737373`
- **Font**: Poppins with Arial fallback
- **Border radius**: 12px
- **Logo**: 🫒 Olive Clean text mark (matching existing transactional templates)
- **Body background**: white (#ffffff)
- **Tone**: Friendly, matching existing transactional email copy style

### Step 3: Deploy auth-email-hook
Deploy the edge function so auth emails start using the branded templates.

### Step 4: Create welcome email template
- New file: `_shared/transactional-email-templates/welcome.tsx`
- Content: Welcomes new client, highlights key services, encourages booking
- Styled consistently with existing transactional templates
- Register in `registry.ts`

### Step 5: Wire welcome email trigger
- In the client signup flow, invoke `send-transactional-email` with `welcome` template after successful registration

### Step 6: Redeploy send-transactional-email
Deploy to pick up the new welcome template in the registry.

## Files Changed
- **Created**: `_shared/email-templates/` (6 auth template files) — via scaffold tool
- **Modified**: All 6 auth templates — brand styling applied
- **Created**: `_shared/transactional-email-templates/welcome.tsx`
- **Modified**: `_shared/transactional-email-templates/registry.ts` — add welcome template
- **Modified**: Client signup component — add welcome email trigger
- **Created/Modified**: `supabase/functions/auth-email-hook/` — via scaffold tool

