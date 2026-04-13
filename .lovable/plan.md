

## CRM Hub: Activity Timeline, Deduplication, Call List, and Quick Notes

This is a large request with many interconnected features. To keep it manageable and shippable, I'll organize it into focused phases.

---

### Phase 1: Database Foundation

**New table: `crm_notes`** — Unified activity/notes system for leads and clients.

```text
crm_notes
  id          uuid PK
  parent_type text NOT NULL  ('lead' | 'client')
  parent_id   uuid NOT NULL
  author_id   uuid (references auth.users)
  content     text NOT NULL
  note_type   text DEFAULT 'note'  ('note', 'phone_call', 'chat', 'system')
  is_task     boolean DEFAULT false
  is_completed boolean DEFAULT false
  created_at  timestamptz DEFAULT now()
```

RLS: Admin full access; staff can view/insert.

---

### Phase 2: Lead Deduplication

**On lead insert** (in `BookingSection.tsx`, `BookPage.tsx`, and chatbot): Before inserting a new lead, check if the email or phone already exists in `leads` or `clients`.

- **Existing client email** → Create lead with `source = 'client_portal'`, score 80, and add a system `crm_notes` entry: "Returning client submitted new inquiry"
- **Existing lead email** → Don't create duplicate; instead update the existing lead's status back to `new` and add a system note: "New inquiry received"
- **New email** → Normal lead creation

This logic goes into `BookingSection.tsx`, `BookPage.tsx`, and the chatbot lead creation.

---

### Phase 3: Transform Lead Detail Modal into Activity Hub

Replace the current static Lead Detail dialog with a **Sheet (side drawer)** containing:

1. **Header**: Name, status badge, score, source — with quick action buttons: "Create Quote", "Log Call", "Send Email", "Convert to Job"
2. **Contact info grid**: Email, phone, location, home size (compact)
3. **Activity Timeline tab**: Vertical timeline showing:
   - System events (lead created, status changes, emails sent from `email_send_log`)
   - CRM notes (from `crm_notes` table)
   - Add Note form at top with note type selector (Note / Phone Call / Chat) and "Mark as Task" toggle
4. **Chat Transcript tab** (if source is chatbot)
5. **Response Timer**: Next to "New" badge, show elapsed time since creation. Card turns orange after 2 hours.

---

### Phase 4: Call List / Retention Page

Add a **"Call List"** item under Clients & Retention in the sidebar.

This page aggregates:
- **Stale leads**: Status = "new", created > 2 hours ago, no follow-up notes
- **Stale quotes**: Estimates with status "sent", sent > 7 days ago  
- **Lost clients**: Clients with no completed job in 45+ days (already partially built in ClientsTab)
- **Follow-up tasks**: `crm_notes` where `is_task = true` and `is_completed = false`

Each row shows: Name, phone, reason for being on list (tag), "Log Call" button, and "Send Nudge" button.

---

### Phase 5: Quick Note Global Button

Add a **"Quick Note"** button to the admin header bar (next to NotificationBell).

- Opens a popover/dialog
- Search field to find a lead or client by name/email
- Once selected: textarea for note, note type selector, save button
- Saves to `crm_notes` without leaving the current page

---

### Files Summary

| File | Action |
|------|--------|
| Database migration | Create `crm_notes` table with RLS |
| `src/components/admin/LeadsTab.tsx` | Replace detail dialog with Sheet; add activity timeline; add response timer; add dedup on "Create Quote" flow |
| `src/components/client/BookingSection.tsx` | Add dedup check before lead insert |
| `src/pages/BookPage.tsx` | Add dedup check before lead insert |
| `src/components/admin/AdminSidebar.tsx` | Add "Call List" nav item |
| `src/pages/AdminDashboard.tsx` | Add CallListTab case; add Quick Note button to header |
| `src/components/admin/CallListTab.tsx` | **New** — aggregated retention/call list page |
| `src/components/admin/QuickNoteButton.tsx` | **New** — global quick note popover |
| `src/components/admin/ActivityTimeline.tsx` | **New** — reusable timeline component for leads and clients |

### What's explicitly excluded (to keep scope reasonable)
- Automated drip email campaigns (Days 2/5/7) — these are marketing emails and would violate email infrastructure rules. The Call List + manual nudge buttons provide the same outcome.
- LinkedIn/Google search button — low-value; can be added later.
- Kanban drag-and-drop view — significant effort; can be a follow-up.

