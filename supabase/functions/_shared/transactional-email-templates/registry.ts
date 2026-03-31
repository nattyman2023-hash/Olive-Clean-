/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'

export interface TemplateEntry {
  component: React.ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  to?: string
  displayName?: string
  previewData?: Record<string, any>
}

import { template as bookingConfirmation } from './booking-confirmation.tsx'
import { template as jobCompleted } from './job-completed.tsx'
import { template as jobReminder } from './job-reminder.tsx'
import { template as invoiceIssued } from './invoice-issued.tsx'
import { template as welcome } from './welcome.tsx'
import { template as jobAssigned } from './job-assigned.tsx'
import { template as timeOffApproved } from './time-off-approved.tsx'
import { template as adminDailyDigest } from './admin-daily-digest.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'booking-confirmation': bookingConfirmation,
  'job-completed': jobCompleted,
  'job-reminder': jobReminder,
  'invoice-issued': invoiceIssued,
  'welcome': welcome,
  'job-assigned': jobAssigned,
  'time-off-approved': timeOffApproved,
  'admin-daily-digest': adminDailyDigest,
}
