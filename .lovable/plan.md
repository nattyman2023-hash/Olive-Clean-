

# Enhanced Chatbot, Location Pages, SEO Meta & Sitemap

## Overview
Four workstreams: (1) Make the chatbot more engaging with quick-reply buttons, typing indicators, and markdown rendering. (2) Enrich location pages with MapTiler embeds, hero images, testimonials, and neighborhood photos. (3) Add per-page SEO meta tags (title, description, OG image, keywords) using react-helmet-async. (4) Generate a sitemap.xml and add structured data (LocalBusiness, Service schemas).

---

## 1. Enhanced Chatbot

### Changes to `src/components/chat/ChatWidget.tsx`
- Install and use `react-markdown` for rendering AI responses with bold, links, lists
- Add **quick-reply suggestion chips** below the latest assistant message (e.g., "Get a quote", "What areas do you serve?", "See our services") — clicking sends that text
- Add a branded avatar image (olive leaf icon or "🫒") instead of the plain "O" circle
- Animate the chat open with a greeting delay (typing dots for 1s, then message appears)
- Add a "Powered by Olive Clean" footer link
- Show context-aware suggestions based on conversation state (initial greeting vs. mid-conversation)

### Changes to `supabase/functions/chat-process/index.ts`
- Update system prompt to be warmer and more personality-driven — use emojis, Nashville references, humor
- Add instruction to suggest quick actions in responses (e.g., "Would you like to [book now](/book) or [see our services](/services/essential)?")
- Add a `suggested_replies` field in the response for the frontend to render as chips

---

## 2. Enriched Location Pages

### Changes to `src/pages/AreaDetail.tsx`
- Add **area-specific data**: coordinates, neighborhood landmarks, hero image URLs (Unsplash Nashville photos), local testimonials, and fun facts per area
- Add a **MapTiler embed** section using the existing `useMapTilerKey` hook — centered on each area's coordinates with a marker
- Add a **hero image** section with a beautiful neighborhood photo using `background-image` with overlay
- Add a **local testimonial** quote per area
- Add **neighborhood landmarks** list (e.g., "Minutes from the Mall at Green Hills")
- Add **Schema.org LocalBusiness** JSON-LD structured data per area
- Add `react-helmet-async` meta tags: title, description, OG image, keywords per area

### Install `react-helmet-async`
- Add `<HelmetProvider>` to `App.tsx`
- Use `<Helmet>` in each page for per-page SEO

---

## 3. Per-Page SEO Meta Tags

### New file: `src/lib/seo.ts`
- Central SEO config mapping routes to `{ title, description, keywords, ogImage }`
- Covers: Index, About, WhyUs, Perks, Team, Careers, Book, each service page, each area page

### New component: `src/components/SEOHead.tsx`
- Wrapper around `<Helmet>` that accepts title, description, keywords, ogImage, canonicalPath
- Renders `<title>`, `<meta name="description">`, `<meta name="keywords">`, OG tags, Twitter tags, canonical URL

### Changes to all public pages
- Add `<SEOHead>` to: `Index.tsx`, `About.tsx`, `WhyUs.tsx`, `PerksPage.tsx`, `Team.tsx`, `Careers.tsx`, `BookPage.tsx`, `ServiceDetail.tsx`, `AreaDetail.tsx`, `Terms.tsx`, `Privacy.tsx`

---

## 4. Sitemap & Structured Data

### New file: `public/sitemap.xml`
- Static XML sitemap listing all public routes with `<lastmod>`, `<changefreq>`, `<priority>`
- Routes: `/`, `/about`, `/why-us`, `/perks`, `/team`, `/careers`, `/book`, `/terms`, `/privacy`, all `/services/*`, all `/areas/*`

### Update `public/robots.txt`
- Add `Sitemap: https://oliveclean.com/sitemap.xml`

### Structured Data in `index.html`
- Add global `Organization` schema JSON-LD in `<head>`

### Per-page structured data
- `AreaDetail.tsx`: `LocalBusiness` schema with area name, address, geo coordinates, service area
- `ServiceDetail.tsx`: `Service` schema with name, description, provider, price

---

## Files Summary

| File | Action |
|---|---|
| `package.json` | Add `react-markdown`, `react-helmet-async` |
| `src/App.tsx` | Wrap with `HelmetProvider` |
| `src/components/SEOHead.tsx` | New: reusable SEO meta component |
| `src/lib/seo.ts` | New: centralized SEO config per route |
| `src/components/chat/ChatWidget.tsx` | Quick replies, markdown, avatar, animations |
| `supabase/functions/chat-process/index.ts` | Warmer prompt, suggested_replies |
| `src/pages/AreaDetail.tsx` | MapTiler embed, hero images, testimonials, landmarks, structured data, SEO |
| `src/pages/ServiceDetail.tsx` | Service schema, SEO head |
| `src/pages/Index.tsx` | SEO head |
| `src/pages/About.tsx` | SEO head |
| `src/pages/WhyUs.tsx` | SEO head |
| `src/pages/PerksPage.tsx` | SEO head |
| `src/pages/Team.tsx` | SEO head |
| `src/pages/Careers.tsx` | SEO head |
| `src/pages/BookPage.tsx` | SEO head |
| `src/pages/Terms.tsx` | SEO head |
| `src/pages/Privacy.tsx` | SEO head |
| `public/sitemap.xml` | New: static sitemap |
| `public/robots.txt` | Add sitemap reference |
| `index.html` | Organization schema JSON-LD |

## Implementation Order
1. Install deps + HelmetProvider + SEOHead component + seo config
2. Add SEOHead to all public pages
3. Enrich AreaDetail with maps, images, landmarks, structured data
4. Enhance ChatWidget with quick replies, markdown, animations
5. Update chat-process prompt
6. Create sitemap.xml, update robots.txt, add Organization schema

