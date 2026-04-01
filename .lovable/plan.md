

# Enhance Why Us, Perks, Team & Trust Signals

Most of the infrastructure (ScrollToTop, chatbot, CRM, location pages, SEO) already exists. This plan focuses on the specific enhancements requested that are not yet implemented.

---

## 1. "Why Us" Page — Detailed Checklist & Featured Team Members

**`src/pages/WhyUs.tsx`**
- Expand the Olive Standard checklist from 10 to 20+ items with granular detail (e.g., "Clean behind refrigerator and oven," "Sanitize light switches, outlets, and door handles," "Dust baseboards and crown molding," "Clean inside microwave and oven door")
- Add a **"Meet Your Cleaners"** section that fetches 3 featured employees from the `employees` table (status = active, photo_url not null) and displays their name, photo, certifications, and a "5-star professional" badge
- Add a **customer testimonial strip** between the checklist and CTA sections

## 2. Trust Badges Near Every "Book Now" Button

**`src/components/TrustBadges.tsx`** (new)
- Small reusable component rendering 3 inline badges: "Background Checked," "Fully Insured," "Eco-Friendly" with shield/leaf icons
- Compact horizontal layout suitable for placement below CTA buttons

**Files using it:**
- `CTASection.tsx` — add below the Book button
- `HeroSection.tsx` — add below the CTA buttons
- `Footer.tsx` — add trust badge row above the copyright line

## 3. Perks Page — Silver/Gold/Platinum Tiers + Referral Section

**`src/pages/PerksPage.tsx`**
- Rename tiers to **Silver** (Monthly, 5% off), **Gold** (Bi-weekly, 10% off), **Platinum** (Weekly, 20% off + Priority Support) to mirror the Fantastic Club model
- Add a dedicated **"Refer a Friend"** section with: "Give $20, Get $20" messaging, explanation of how it works, and a CTA to book
- Add a comparison table for the three tiers showing included perks

## 4. Parallax Hero Image

**`src/components/HeroSection.tsx`**
- Replace the placeholder gradient box with a real Unsplash Nashville home image using `background-attachment: fixed` for the parallax scroll effect
- Content overlays the fixed background image with a semi-transparent gradient

## 5. Mobile Grid Fix

**`src/components/WhyUsSection.tsx`** and other card grids
- Ensure grid uses `repeat(auto-fit, minmax(300px, 1fr))` pattern so cards stack cleanly on small screens instead of squeezing

---

## Files Summary

| File | Change |
|---|---|
| `src/pages/WhyUs.tsx` | Expanded 20+ checklist items, "Meet Your Cleaners" section with DB fetch |
| `src/components/TrustBadges.tsx` | New: reusable trust badge strip |
| `src/components/HeroSection.tsx` | Parallax background image |
| `src/components/CTASection.tsx` | Add TrustBadges below CTA |
| `src/components/Footer.tsx` | Add TrustBadges row |
| `src/pages/PerksPage.tsx` | Silver/Gold/Platinum tiers, Refer-a-Friend section |
| `src/components/WhyUsSection.tsx` | Mobile-safe auto-fit grid |

