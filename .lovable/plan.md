

# Plan: Dispatch Engine + Employee On-Site Dashboard + Careers Upgrade

## Overview

Three major feature areas plus footer update and sample data seeding.

---

## 1. Intelligent Dispatch Engine (Admin — Routes Tab Enhancement)

Upgrade `RoutesTab.tsx` with dispatch logic:

- **Auto-assign button**: Algorithm that assigns unassigned jobs to technicians based on:
  - Geographic proximity (matching job neighborhood to tech's current zone)
  - Skill constraints (check job service requires cert → match tech certifications)
  - Workload balancing (spread jobs evenly across techs)
- **Recursive scheduling**: "Generate Recurring" button that creates the next 6 months of jobs for clients with recurring frequency, preserving technician continuity (same `assigned_to`)
- **Constraint mismatch warnings**: Visual flag when a tech lacks required cert for assigned job
- **Perks Club gap filler integration**: When a job is cancelled from routes view, auto-trigger the Perks Club matching (link to existing PerksTab gap filler)

No new tables needed — uses existing `jobs`, `employees`, `clients` tables.

## 2. Employee Dashboard — "On-Site Assistant"

Complete rebuild of `EmployeeDashboard.tsx`:

- **Day-at-a-Glance**: Job sequence cards with time, client name, address, service tier
- **Status Sliders**: Interactive status progression: `accepted` → `on_route` → `on_site` → `complete` — updates `jobs.status` via mutation
- **Home Memory Panel**: Expandable section per job showing `clients.preferences` JSONB (pet info, special instructions, "don't wake the baby" notes)
- **Tier-Specific Checklists**: Dynamic checklist based on service type:
  - `essential-clean`: floors, surfaces, bathrooms
  - `deep-clean`: + baseboards, door frames, light fixtures
  - `signature-deep-clean`: + windows, cabinets interior
- **Before/After Photo Upload**: Camera capture + upload to `after_photos` bucket, required before marking job "complete"
- **Incident/Supply Report**: Quick form to flag maintenance issues or low supplies (inserts into `supply_usage_logs` or a notes field)

### Database Changes
- Add `checklist_state` (jsonb, default `'{}'`) column to `jobs` table for persisting checklist progress per job
- Add `before_photos` storage bucket (public) for before-job photos

## 3. Multi-Step Careers Application Page

Rebuild `Careers.tsx` as a multi-step wizard:

- **Step 1**: Personal info (name, email, phone)
- **Step 2**: Experience & availability (years of experience, available days checkboxes, transportation yes/no)
- **Step 3**: Resume upload + cover note
- **Step 4**: Review & submit

Progress bar at top showing current step.

### Database Changes
- Add columns to `applicants`: `years_experience` (integer, nullable), `available_days` (jsonb, nullable), `has_transportation` (boolean, nullable)

## 4. Job Listings on Careers Page

- Add `job_postings` table: `id`, `title`, `description`, `location`, `type` (full-time/part-time), `requirements` (text), `status` (open/closed), `created_at`
- RLS: Admin full access, public can read open postings
- Display open postings above the application form on the Careers page
- Add "Job Postings" management section in HiringTab for admin to create/edit postings

## 5. Footer Update

Add "Careers" link to `Footer.tsx` between "About" and "Privacy".

## 6. Sample Data

Seed via insert tool (not migration):
- 3 job postings (Cleaning Technician, Team Lead, Part-Time Weekend Cleaner)
- Update existing sample jobs with `assigned_to` matching employee IDs (now that FK is dropped)
- Sample checklist states on a couple jobs

---

## Files Changed

| File | Change |
|------|--------|
| Migration SQL | Add `checklist_state` to jobs, `job_postings` table, extra `applicants` columns, `before_photos` bucket |
| `src/components/admin/RoutesTab.tsx` | Auto-assign algorithm, recurring scheduling, constraint warnings |
| `src/pages/EmployeeDashboard.tsx` | Full rebuild: status sliders, Home Memory, checklists, photo upload, incident reports |
| `src/pages/Careers.tsx` | Multi-step wizard with job listings display |
| `src/components/admin/HiringTab.tsx` | Add job postings management section |
| `src/components/Footer.tsx` | Add Careers link |
| Insert SQL | Sample job postings, job assignments, checklist data |

