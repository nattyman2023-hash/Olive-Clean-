

# Add "Back to Website" Link on Admin Login

Add a link below the "Forgot password?" button (in login mode) and below "Back to sign in" (in forgot mode) that navigates to the main website (`/`).

## Change

**File: `src/pages/AdminLogin.tsx`**

After the "Forgot password?" button (~line 73), add:
```tsx
<a href="/" className="block w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors mt-1">
  ← Back to website
</a>
```

Similarly after the "Back to sign in" button (~line 87), add the same link so it's visible in both login and forgot-password modes.

