

## What's Been Implemented vs. What's Still Missing

### Completed (4 items)
1. **Stripe $0 Bug Fix** — Fixed in `finalize-invoice` edge function
2. **Quote → Job Conversion** — "To Job" button added in EstimatesSection
3. **Admin Expense Addition** — "+ Add Expense" button added in ExpensesSection
4. **Resend Invoice** — Resend button added to InvoicesSection
5. **Re-evaluate Rejected Expenses** — Re-evaluate action added

### Still Missing (11 items)

#### High Priority
| # | Feature | Description |
|---|---------|-------------|
| 1 | **Client Portal Activation from Quote** | When a quote is approved, offer an "Approve Client for Portal" action that sends an invitation email to set up their portal account |
| 2 | **Communication Log Email Preview** | Clicking an email entry in the Comms Log should open a side drawer rendering the full HTML body of the sent email |
| 3 | **Send Feedback Request** | On Job details, add a "Send Feedback Request" button that emails the feedback link to the client (instead of just copy-to-clipboard) |
| 4 | **Job Posting Full CRUD** | Make posting titles clickable to open edit forms; add Archive/Remove functionality separate from closing applications |

#### Medium Priority
| # | Feature | Description |
|---|---------|-------------|
| 5 | **Time Off Request Drill-Down** | Make time-off entries clickable → side drawer with full reason, reviewer info, and an "Alter Decision" button to change approved↔denied |
| 6 | **Dismissible Low Stock Banner** | Add an X button to the global red "Low Stock Alerts" banner so it can be hidden for the session |
| 7 | **Photo-to-Job Linking** | In the Assets/Photos list, show the linked Job reference (e.g. "Job #123") and make it clickable to navigate to that job |

#### AI & Chatbot (Lower Priority)
| # | Feature | Description |
|---|---------|-------------|
| 8 | **AI Assist for Quote Creation** | Add an "AI Assist" button on quote description/notes fields to auto-generate professional service descriptions |
| 9 | **Chatbot Exit Intent Trigger** | Olivia pops up when user's mouse moves toward browser top (exit intent) |
| 10 | **Chatbot Page Click Triggers** | Olivia appears with context-aware messages when leaving high-value pages (Services, Pricing) |
| 11 | **Chatbot Decision Making** | Enhance Olivia to collect booking/quote data within the chat and submit inquiries directly |

---

### Recommended Next Batch

I recommend tackling items **1–7** in the next implementation round — they are concrete UI/UX improvements. Items 8–11 (AI/chatbot) are more complex integrations that benefit from a separate focused iteration.

### Implementation Plan for Items 1–7

**File changes:**

| File | Work |
|------|------|
| `src/components/admin/finance/EstimatesSection.tsx` | Add "Approve Client for Portal" action on approved quotes that triggers client invite |
| `src/components/admin/EmailsTab.tsx` | Make email rows clickable → Sheet drawer that renders stored `email_body` HTML |
| `src/components/admin/JobsTab.tsx` | Add "Send Feedback Request" button that emails the feedback link via `send-transactional-email` |
| `src/components/admin/HiringTab.tsx` | Make posting titles clickable → edit modal; add Archive/Remove actions |
| `src/components/admin/TimeOffManager.tsx` | Make entries clickable → Sheet drawer with full details + "Alter Decision" button |
| `src/components/admin/LowStockWidget.tsx` | Add dismiss X button using session state (`useState`) |
| `src/components/admin/RecentUploads.tsx` | Display linked job reference next to each photo; make it a clickable link to the job |
| New email template | `feedback-request.tsx` — branded email with feedback link button |

**Database migration:**
- Add `email_body` column to `email_send_log` table (if not already present) to store rendered HTML for the Comms Log preview

