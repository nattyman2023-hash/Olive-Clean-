

## Leads Kanban Board with Drag-and-Drop Pipeline

Transform the Leads section from a list view to a visual Kanban sales funnel. The existing drawer, ActivityTimeline, deduplication, and boomerang infrastructure stays — we're swapping the presentation layer.

---

### 1. Kanban Architecture

Six columns mapped to the existing `leads.status` field, with the Outreach column reading from `leads.outreach_status`:

| Column | Source field / value |
|--------|---------------------|
| **New** | `status = 'new'` |
| **Contacted** | `status = 'contacted'` |
| **Quoted** | `status = 'quoted'` |
| **Outreach (Nudge)** | `status = 'follow_up'` OR boomeranged leads |
| **Converted** | `status = 'converted'` (collapsed by default — shows count only) |
| **Archived** | `status = 'archived'` (hidden by default — toggle to view) |

`status = 'scheduled'` leads remain hidden (already live in Jobs).

---

### 2. Card Design

Each card shows:
- **Header**: Name + color-coded score badge (red <40, amber 40–70, green >70)
- **Body**: Service type, bedrooms/bathrooms, frequency
- **Footer**: "Last activity X ago" (most recent `crm_notes` entry or `created_at`), source icon
- **Red glow border**: if `status = 'new'` and no `crm_notes` entry in 48+ hours

Clicking a card opens the existing right-side Sheet drawer with ActivityTimeline (no change to drawer).

---

### 3. Drag-and-Drop Behavior

Use `@dnd-kit/core` (lighter than react-beautiful-dnd, better React 18 support).

| Drop target | Action |
|-------------|--------|
| Any standard column | Update `leads.status` immediately |
| **Quoted** | Update status + open "Create Quote" drawer prefilled |
| **Archived** | Open dialog asking for loss reason (Price / No response / Out of area / Other) → save reason as `crm_notes` system entry → set `status = 'archived'` |
| **Converted** | Trigger existing "Convert to Job" flow |

Optimistic UI updates with rollback on error.

---

### 4. Layout

```text
┌─────────┬───────────┬─────────┬──────────────┬───────────┬──────────┐
│  NEW    │ CONTACTED │ QUOTED  │ OUTREACH     │ CONVERTED │ ARCHIVED │
│ (count) │  (count)  │ (count) │ (count)      │  [hidden] │ [toggle] │
├─────────┼───────────┼─────────┼──────────────┼───────────┼──────────┤
│ [card]  │ [card]    │ [card]  │ [card]       │           │          │
│ [card]  │ [card]    │         │ [card]       │           │          │
│ [card]  │           │         │              │           │          │
└─────────┴───────────┴─────────┴──────────────┴───────────┴──────────┘
```

Header bar above board keeps existing controls: search, status filter (now acts as column highlight), source filter, sort, and "+ New Lead" button. A "View toggle" lets users switch back to the old list/table view if preferred.

Horizontal scroll on narrow viewports; columns stack vertically below 768px.

---

### 5. Files

| File | Action |
|------|--------|
| `package.json` | Add `@dnd-kit/core` and `@dnd-kit/sortable` |
| `src/components/admin/LeadsTab.tsx` | Add view toggle (Kanban / List); render new Kanban as default |
| `src/components/admin/leads/LeadsKanban.tsx` | **New** — Kanban board with DndContext, columns, drop handlers |
| `src/components/admin/leads/LeadKanbanCard.tsx` | **New** — Individual draggable card with score, activity, glow |
| `src/components/admin/leads/ArchiveReasonDialog.tsx` | **New** — Loss reason prompt on archive drop |
| `src/components/admin/leads/leadStageConfig.ts` | **New** — Column definitions and status→column mapping |

No database migration needed — `status` and `outreach_status` columns already exist. Loss reasons are persisted as `crm_notes` system entries with `note_type = 'system'` and content like "Lead archived: Price too high".

### What stays the same
- Existing right-side Sheet drawer for lead details
- ActivityTimeline component
- Deduplication logic on lead creation
- Boomerang logic from cancelled jobs
- "+ New Lead", edit, delete actions

