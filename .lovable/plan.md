

# Plan: Dedicated Pages for Areas, Services, Terms & Privacy

## New Pages to Create

### 1. Service Detail Pages
Create a reusable `ServicePage` component and 4 routes — one per cleaning package. Each page will have Navbar + Footer, a hero section with the service name/price/description, a detailed features list, FAQs specific to that service, and a CTA to book.

**Slugs:** `/services/essential`, `/services/general`, `/services/deep-clean`, `/services/makeover`

**New file:** `src/pages/ServiceDetail.tsx`
- Accepts a slug param, looks up service data from a static map
- Sections: hero with price, what's included checklist, ideal-for blurb, FAQ, CTA
- Reuses the existing `About.tsx` layout pattern (Navbar + RevealSection + Footer)

### 2. Area Pages
Create a reusable `AreaPage` component and 5 routes — one per service area.

**Slugs:** `/areas/belle-meade`, `/areas/brentwood`, `/areas/franklin`, `/areas/green-hills`, `/areas/west-nashville`

**New file:** `src/pages/AreaDetail.tsx`
- Accepts a slug param, looks up area data from a static map
- Sections: hero with area name, description of the neighborhood, services available, CTA to book
- Mention area-specific details (e.g., "Serving Belle Meade's historic estates")

### 3. Terms of Service Page
**New file:** `src/pages/Terms.tsx`
- Standard terms of service content with Navbar + Footer
- Sections: acceptance, services description, booking/cancellation policy, liability, payment terms, privacy reference

### 4. Privacy Policy Page
**New file:** `src/pages/Privacy.tsx`
- Standard privacy policy content with Navbar + Footer
- Sections: data collection, usage, cookies, third parties, rights, contact

## Updates to Existing Files

### `src/App.tsx`
Add routes:
- `/services/:slug` → `ServiceDetail`
- `/areas/:slug` → `AreaDetail`
- `/terms` → `Terms`
- `/privacy` → `Privacy`

### `src/components/Footer.tsx`
- Service list items → `<Link to="/services/essential">` etc.
- Area list items → `<Link to="/areas/belle-meade">` etc.
- Privacy link → `/privacy`, Terms link → `/terms`

### `src/components/ServicesSection.tsx`
- Add a "Learn More" link under each service card pointing to `/services/{slug}`

## Files Summary

| File | Action |
|------|--------|
| `src/pages/ServiceDetail.tsx` | Create — dynamic service detail page |
| `src/pages/AreaDetail.tsx` | Create — dynamic area detail page |
| `src/pages/Terms.tsx` | Create — terms of service |
| `src/pages/Privacy.tsx` | Create — privacy policy |
| `src/App.tsx` | Add 4 new routes |
| `src/components/Footer.tsx` | Link services, areas, terms, privacy |
| `src/components/ServicesSection.tsx` | Add "Learn More" links |

No database changes needed.

