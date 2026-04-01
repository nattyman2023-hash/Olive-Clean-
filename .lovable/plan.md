

# Make Invoice/Estimate Editing More Discoverable

## Problem
The edit feature exists inside the `InvoicePreview` component (pencil icon toggles edit mode), but users must first click the invoice number to open the preview, then find the small pencil icon. This two-step flow is not obvious.

## Solution
Add an explicit "Edit" / "View" button on each invoice and estimate row in the list view, making the preview (and its edit capability) immediately accessible.

### Changes

**`src/components/admin/finance/InvoicesSection.tsx`**
- Add an "Edit" icon button (Pencil) next to Send/Paid buttons on each invoice row
- Clicking it opens the preview in edit mode directly
- Add a new prop or state so InvoicePreview can start in edit mode

**`src/components/admin/finance/EstimatesSection.tsx`**
- Same pattern: add "Edit" button on each estimate row

**`src/components/admin/finance/InvoicePreview.tsx`**
- Add optional `initialEditMode` prop (default false) so the preview can open directly in edit mode

This is a small UI change — 3 files, minimal edits.

