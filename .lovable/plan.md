

# Fix Job Assignment — `employee.id` vs `employee.user_id` Mismatch

## Problem
The `jobs.assigned_to` column stores the employee's **`user_id`**, but the JobsTab dropdowns use **`employee.id`** (the employees table primary key) as the `<option value>`. This means every assignment writes the wrong ID to the database, so the job appears unassigned or linked to nobody.

The RoutesTab correctly uses `user_id` everywhere; the bug is isolated to JobsTab.

## Fix — `src/components/admin/JobsTab.tsx`

Three locations need to change from `e.id` → `e.user_id`:

### 1. Create Job form dropdown (line 403)
```tsx
// Before
<option key={e.id} value={e.id}>{e.name}</option>
// After
<option key={e.id} value={e.user_id}>{e.name}</option>
```

### 2. Reassign dropdown in job detail card (line 549)
```tsx
// Before
<option key={e.id} value={e.id}>{e.name}</option>
// After
<option key={e.id} value={e.user_id}>{e.name}</option>
```

### 3. Email lookup after assignment (lines 155, 226)
The `employees.find()` calls that look up the employee for sending notification emails also match on `e.id` — these need to match on `e.user_id` instead:
```tsx
// Line 155 (create job email)
const emp = employees.find((e) => e.user_id === form.assigned_to);
// Line 226 (reassign email)  
const emp = employees.find((e) => e.user_id === employeeId);
```

### Files modified
- `src/components/admin/JobsTab.tsx` — 4 line changes

No database or RLS changes needed. The schema and policies are correct; only the client-side value binding was wrong.

