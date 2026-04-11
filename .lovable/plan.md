

## Auto-Create Invoice on Job Completion + Restore Permissions Visibility

### Problem 1: No invoice draft on job completion
When a job is marked "completed" in `JobsTab.tsx`, the system updates loyalty counters but does not create an invoice. Admins must manually create invoices for completed jobs.

### Problem 2: Permissions/Role Creation not visible
The Permissions manager (with role creation) exists and works — it's under **Settings → Permissions** in the sidebar. It may just be hard to find since Settings is the last group and might be collapsed. No code change needed here, just awareness. However, I can make it more discoverable if you'd like.

---

### Changes

#### 1. Auto-generate invoice draft on job completion (`src/components/admin/JobsTab.tsx`)

In the `updateJobStatus` function, after the loyalty logic runs for `status === "completed"`, add:

```typescript
// Auto-create invoice draft
const completedJob = jobs.find(j => j.id === id);
if (completedJob) {
  const invoiceNumber = `INV-${Date.now()}`;
  const items = [{
    description: completedJob.service,
    quantity: 1,
    rate: Number(completedJob.price || 0),
    amount: Number(completedJob.price || 0),
  }];
  const subtotal = Number(completedJob.price || 0);
  
  await supabase.from("invoices").insert({
    client_id: completedJob.client_id,
    job_id: id,
    invoice_number: invoiceNumber,
    status: "draft",
    items,
    subtotal,
    tax_rate: 0,
    tax_amount: 0,
    total: subtotal,
  });
}
```

Also apply the same logic to the bulk status update function (around line 421).

#### 2. Same for Employee Dashboard job completion
Check if the employee dashboard also has a "complete job" action, and add the same invoice creation there.

### Files Summary

| File | Action |
|------|--------|
| `src/components/admin/JobsTab.tsx` | Add auto-invoice-draft creation on job completion (single + bulk) |
| `src/pages/EmployeeDashboard.tsx` | Add auto-invoice-draft if employees can mark jobs complete |

### Note on Permissions
Your role creation feature is at **Settings → Permissions** in the admin sidebar. It's fully functional — click the Settings group to expand it and you'll see "Permissions" with the shield icon.

