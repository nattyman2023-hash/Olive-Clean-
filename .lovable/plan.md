

## Next Phase: Loading, Logging, Error Handling & SEO Improvements

### What We Found

- **No Error Boundary** — any component crash takes down the entire app with a white screen
- **No lazy loading** — all 20+ page components are bundled upfront, increasing initial load time
- **No loading skeletons** on most data-fetching pages (only Team and Admin have them)
- **No structured logging** — scattered `console.error` calls with no centralization
- **SEO gaps** — missing JSON-LD on most pages, no breadcrumb markup, no FAQ schema on service pages, no `lastmod` in sitemap

---

### Plan

#### 1. Add Global Error Boundary

Create `src/components/ErrorBoundary.tsx` — a React class component that catches render errors and shows a friendly fallback UI with a "Try Again" button. Wrap the app routes in `App.tsx` with it.

#### 2. Lazy-Load All Page Components

Convert all 20 page imports in `App.tsx` to `React.lazy()` with a `Suspense` wrapper showing a branded loading spinner. This splits the bundle so users only download code for the page they visit.

#### 3. Add Loading Skeletons to Data-Fetching Pages

Add skeleton placeholders to pages that fetch data on mount:
- **WhyUs** (employee list)
- **Careers** (job openings)
- **ClientDashboard** (jobs, invoices)
- **EmployeeDashboard** (schedule)
- **AreaDetail** (map loading)

#### 4. Centralized Logger Utility

Create `src/lib/logger.ts` with `logger.info()`, `logger.warn()`, `logger.error()` methods that:
- Log to console in development
- Could be extended to send errors to an external service (Sentry, etc.) in production
- Replace scattered `console.error` calls across the codebase

#### 5. Enhanced SEO — JSON-LD Structured Data

Add structured data to pages that currently lack it:
- **Homepage**: `LocalBusiness` + `WebSite` with `SearchAction`
- **About**: `AboutPage` schema
- **Service pages**: `Service` schema with `offers` (already partially done — verify and enhance with `AggregateRating`)
- **Area pages**: `LocalBusiness` with `areaServed` (already partially done — verify)
- **Careers**: `JobPosting` schema for each open position
- **FAQ sections**: `FAQPage` schema on service detail pages

#### 6. Enhanced SEO — Breadcrumb Navigation + Schema

Add visual breadcrumbs to interior pages (Services, Areas, About, Why Us, etc.) and emit matching `BreadcrumbList` JSON-LD so Google shows breadcrumb trails in search results.

#### 7. Dynamic Sitemap with `lastmod`

Update `sitemap.xml` to include `<lastmod>` dates. Add a note about generating it dynamically in the future when content changes.

#### 8. Meta Improvements

- Add `<meta name="robots" content="index, follow">` to public pages
- Add `noindex` to dashboard/login pages (Admin, Client, Employee dashboards and logins)
- Ensure all pages have unique, descriptive `<title>` tags (verify client/employee/admin pages)

---

### Files to Create/Modify

| File | Action |
|------|--------|
| `src/components/ErrorBoundary.tsx` | Create |
| `src/lib/logger.ts` | Create |
| `src/App.tsx` | Lazy imports + ErrorBoundary + Suspense |
| `src/components/SEOHead.tsx` | Add robots meta support |
| `src/lib/seo.ts` | Add noindex config for dashboard pages |
| `src/pages/WhyUs.tsx` | Add skeletons |
| `src/pages/Careers.tsx` | Add skeletons + JobPosting JSON-LD |
| `src/pages/Index.tsx` | Add WebSite + LocalBusiness JSON-LD |
| `src/pages/About.tsx` | Add AboutPage JSON-LD |
| `src/pages/ServiceDetail.tsx` | Add FAQPage JSON-LD |
| `src/pages/AreaDetail.tsx` | Add breadcrumbs |
| `src/pages/ClientDashboard.tsx` | Add noindex SEO, skeletons |
| `src/pages/AdminDashboard.tsx` | Add noindex SEO |
| `src/pages/EmployeeDashboard.tsx` | Add noindex SEO |
| `src/hooks/useMapTilerKey.ts` | Use logger |
| `src/components/chat/ChatWidget.tsx` | Use logger |
| `src/components/admin/BookingsTab.tsx` | Use logger |
| `public/sitemap.xml` | Add lastmod dates |

