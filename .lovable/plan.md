
# Olive Clean — Customer-Facing Website

## Overview
Build a stunning, mobile-first marketing website for Olive Clean, a premium residential cleaning service in Nashville, TN. The site will embody the "calm luxury" brand identity and guide visitors through a conversion-optimized journey from awareness to booking.

## Brand System Setup
- Configure Tailwind with Olive Clean's color palette: Olive Moss (#7F8151), Sage Leaf (#6B775C), Coral Sunset (#F28C7E), Charcoal (#2E2E2E), Harvest Gold (#C29F5D)
- Import Poppins font family (Google Fonts)
- Establish consistent spacing, border-radius, and shadow tokens for the "sanctuary" aesthetic

## Website Sections (Single-Page Landing)

### 1. Hero Section
- Full-width hero with warm lifestyle imagery placeholder and headline: "Reclaim Your Weekends"
- Subtext emphasizing family time and peace of mind
- Primary CTA button: "Get Your Free Estimate"

### 2. Services & Pricing Tiers
- Four beautifully designed cards for Essential, General, Signature Deep Clean, and Makeover Deep Clean
- Each card lists key inclusions, starting price, and a "Book Now" CTA
- Visual hierarchy using brand greens and coral accents

### 3. "Why Olive Clean" / Trust Section
- Bonded & insured, background-checked teams, eco-friendly products
- Nashville neighborhood focus (Belle Meade, Brentwood, etc.)
- Icon-driven layout with brief, impactful copy

### 4. Time Saved Calculator
- Simple interactive widget: select home size + frequency → shows hours saved per month
- Reinforces "Reclaim Your Time" value proposition

### 5. Olive Perks Club Teaser
- Brief explainer of the flexibility-based savings program (up to 60% off)
- CTA to learn more or join the waitlist

### 6. Social Proof
- Testimonial cards with star ratings (placeholder content)
- Trust badges and review platform logos

### 7. Booking / Contact Flow
- Multi-step form: select service tier → home details → preferred schedule → contact info
- Form submissions stored in Supabase (basic backend)
- Success confirmation with next-steps messaging

### 8. Footer
- Contact info, service areas, social links
- Quick links to services, about, and booking

## Basic Backend (Supabase)
- Set up Supabase project with Lovable Cloud
- Create a `booking_requests` table to capture form submissions
- Basic RLS so only admins can read submissions
- No auth required for customers at this stage

## Mobile Responsiveness
- All sections fully responsive with mobile-first design
- Hamburger navigation on mobile
- Touch-friendly CTAs and form inputs

## Pages
- **/** — Main landing page (all sections above)
- **/book** — Dedicated booking page (the multi-step form, also accessible from CTAs)
