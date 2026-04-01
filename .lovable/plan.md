

# SEO Pages, UX Fixes, AI Chatbot, and CRM Lead Management

This is a large scope with 4 major workstreams. To keep things manageable and shippable, here's the implementation broken into phases.

---

## Phase 1: Navigation & UX Fixes

### ScrollToTop Component
- New file: `src/components/layout/ScrollToTop.tsx` — uses `useLocation()` to call `window.scrollTo(0, 0)` on every route change
- Add to `App.tsx` inside `<BrowserRouter>`

### Parallax Hero
- Update `HeroSection.tsx` to use `background-attachment: fixed` on a hero image container, with content cards sliding over

### Responsive Typography
- Add `clamp()` utility classes in `index.css` for heading sizes (e.g., `text-clamp-hero`, `text-clamp-section`) so text scales fluidly across viewports

---

## Phase 2: SEO & Content Pages

### Dedicated "Why Us" Page (`src/pages/WhyUs.tsx`)
- Full page with trust signals: background checks, "The Olive Standard" checklist, insurance/bonding details, team photos section
- Navbar link added

### Dedicated "Perks" Page (`src/pages/Perks.tsx`)
- Standalone page for recurring client benefits: savings tiers, referral bonuses, priority scheduling, "The more you clean, the more you save" messaging
- Navbar link added

### "Our Team" Section (`src/pages/Team.tsx`)
- Fetches from `employees` table (photo_url, name, certifications)
- Shows real team members with photos and brief bios
- Linked from About page and Navbar

### Enhanced Location Pages
- Update `src/pages/AreaDetail.tsx` to include:
  - Localized landmark references in copy
  - A static map image or MapTiler embed focused on the service area
  - Schema.org LocalBusiness structured data in `<Helmet>` (add `react-helmet-async`)
  - Internal links to relevant service pages

### Navbar Updates (`src/components/Navbar.tsx`)
- Add "Why Us", "Perks", and "Our Team" links
- Reorganize mobile menu for new pages

### Footer Updates (`src/components/Footer.tsx`)
- Add links to new pages under a "Company" column

---

## Phase 3: AI Chatbot Widget

### Database Migration
- New `leads` table:
  - `id`, `name`, `email`, `phone`, `location`, `bedrooms`, `bathrooms`, `frequency`, `urgency`, `score` (integer 0-100), `status` (text: new/quoted/scheduled/converted), `source` (text: chatbot/form/manual), `chat_transcript` (jsonb), `notes`, `created_at`, `converted_job_id` (uuid nullable)
- RLS: Admin full access, staff can SELECT

### Chat Widget UI (`src/components/chat/ChatWidget.tsx`)
- Floating button (bottom-right) with branded avatar "Olivia"
- Opens a slide-up chat panel
- Multi-step guided conversation: greeting → name/email capture → home details → service recommendation → "Book a Call" or "Get Instant Quote" CTA
- Stores lead in `leads` table on completion
- Uses Lovable AI (google/gemini-2.5-flash) via edge function for conversational responses

### Chat Edge Function (`supabase/functions/chat-process/index.ts`)
- Receives conversation history + user message
- System prompt: act as "Olivia from Olive Clean," qualify leads, capture details
- Returns AI response + extracted lead data
- Uses structured output to extract name, email, phone, location, home size when mentioned

---

## Phase 4: CRM & Lead Management

### Lead Scoring Logic (in edge function or client-side)
- Weekly frequency: +30 pts
- 4+ bedrooms: +20 pts
- High-value area (Belle Meade, Brentwood): +15 pts
- Has email + phone: +10 pts
- Urgency "ASAP": +15 pts

### Admin Leads Dashboard
- New tab "Leads" in `AdminDashboard.tsx` (adminOnly)
- New component: `src/components/admin/LeadsTab.tsx`
  - Pipeline view: cards in columns (New → Quoted → Scheduled → Converted)
  - Each card: name, score badge, source icon, contact info, time since created
  - "Convert to Job" button: creates a job + client record from lead data in one click
  - Follow-up alert: highlight leads not contacted within 2 hours
  - Search/filter by status, score range, date

### Notification Trigger
- DB trigger on `leads` INSERT: notify all admins with type `new_lead`
- Update `NotificationBell.tsx` TYPE_CONFIG with `new_lead` type + "View Lead" action button

---

## Files Summary

| File | Action |
|---|---|
| `src/components/layout/ScrollToTop.tsx` | New: scroll-to-top on route change |
| `src/App.tsx` | Add ScrollToTop, new routes (WhyUs, Perks, Team) |
| `src/components/HeroSection.tsx` | Parallax background effect |
| `src/index.css` | Clamp typography utilities |
| `src/pages/WhyUs.tsx` | New: trust signals page |
| `src/pages/Perks.tsx` | New: perks detail page |
| `src/pages/Team.tsx` | New: team page from employees table |
| `src/pages/AreaDetail.tsx` | Enhanced with maps, schema.org, landmarks |
| `src/components/Navbar.tsx` | New links |
| `src/components/Footer.tsx` | New links |
| Migration SQL | `leads` table + trigger |
| `src/components/chat/ChatWidget.tsx` | New: AI chatbot UI |
| `supabase/functions/chat-process/index.ts` | New: AI chat brain |
| `src/components/admin/LeadsTab.tsx` | New: CRM pipeline |
| `src/pages/AdminDashboard.tsx` | Add Leads tab |
| `src/components/NotificationBell.tsx` | Add `new_lead` type |

### Implementation Order
1. ScrollToTop + responsive typography (quick wins)
2. WhyUs, Perks, Team pages + Navbar/Footer updates
3. AreaDetail enhancements
4. Database migration for `leads` table
5. Chat widget + edge function
6. Leads CRM tab + notification trigger

