

# Fix Password Reset + Add About Page

## 1. Fix "Auth session missing!" on Reset Password

**Root cause:** The `/reset-password` page doesn't wait for the auth recovery session to be established. When the user clicks the email link, the URL contains recovery tokens in the hash fragment. The page must listen for the `PASSWORD_RECOVERY` auth event before allowing `updateUser()`.

**Fix in `src/pages/ResetPassword.tsx`:**
- Add a `useEffect` that listens to `onAuthStateChange` for the `PASSWORD_RECOVERY` event
- Track a `ready` state — only show the form once the recovery session is active
- Show a loading spinner while waiting for the session
- Show an error message if the token is invalid/expired

## 2. About Page (`src/pages/About.tsx`)

A new page telling the Olive Clean story with sections for:
- **Hero/Intro** — "The Olive Clean Story" headline with a brief mission statement about premium residential cleaning in Nashville
- **The Debbie Sardone Method** — explanation of the speed-cleaning philosophy: trained technicians, systematic approach, consistent results
- **Our Values** — 3-4 core values (e.g., "We Remember Everything," "Flexibility Over Rigidity," "Premium Without Pretension," "Community First")
- **Why Nashville** — brief section on serving Nashville's most discerning families
- CTA to book a cleaning

Consistent with existing design language (rounded elements, muted backgrounds, primary color accents).

## 3. Wire Up Route + Navigation

- Add `/about` route in `src/App.tsx`
- Add "About" link to `src/components/Navbar.tsx`
- Add "About" link to Footer

## Files to Create/Edit
- **Edit**: `src/pages/ResetPassword.tsx` — fix recovery session handling
- **Create**: `src/pages/About.tsx` — About page
- **Edit**: `src/App.tsx` — add /about route
- **Edit**: `src/components/Navbar.tsx` — add About nav link
- **Edit**: `src/components/Footer.tsx` — add About link

