

## Add Communication Logs to Management + Enhance Email Tracking

### What Already Exists
The `EmailsTab` component is fully built with email log deduplication, time range filters, status filters, template filters, stat cards, pagination, and template previews. It was disconnected from the sidebar when "Emails" was removed from Assets. We need to re-wire it and add the missing features.

### Changes

#### 1. Re-add to Sidebar and Dashboard as "Comms Log"
- **`AdminSidebar.tsx`**: Add `{ value: "comms-log", label: "Comms Log", icon: Mail }` to the Management group
- **`AdminDashboard.tsx`**: Add `case "comms-log": return <EmailsTab />;` and import it

#### 2. Add Search Bar to EmailsTab
- Add a text search input that filters the log table by `recipient_email` (partial match)
- Place it alongside the existing template and status filters

#### 3. Add Open Rate and Delivery Rate Stat Cards
- Current stats: Total, Sent, Failed, Suppressed
- Add: **Open Rate** (% of emails with status "viewed" — note: email open tracking would require pixel tracking which we don't have, so we'll show "Delivered" rate instead: sent / total)
- Add: **Delivery Success** (sent / (sent + failed + bounced) as percentage)
- Rename cards to match the request: "Total Sent", "Open Rate" → "Delivery Rate", "Delivery Success"

#### 4. Add One-Click Resend Button
- On each failed email row, show a "Resend" button that calls `send-transactional-email` with the same template and recipient
- Parse the `metadata` field to reconstruct the original `templateData` if available

#### 5. Add Metadata Link Column
- Show a clickable link in the table when metadata contains a quote ID or job ID, linking to the relevant admin section

#### 6. Chatbot Transcript Logging (Deferred)
The user asked if Olivia (chatbot) transcripts should also appear here. This can be added later by logging chat completions to the same `email_send_log` table or a separate `communication_logs` view. For now, we'll focus on email communications only and note this as a future enhancement.

### Files Summary

| File | Action |
|------|--------|
| `src/components/admin/AdminSidebar.tsx` | Add "Comms Log" to Management group |
| `src/pages/AdminDashboard.tsx` | Add EmailsTab case for "comms-log" section |
| `src/components/admin/EmailsTab.tsx` | Add search bar, delivery rate stats, resend button on failed rows, metadata links |

